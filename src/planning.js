import { customerTax } from "./taxation.js";
import { requirements, fullCost, produce } from "./operations.js";

export const localDate = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
function number(value, label, min = 0) {
  const n = Number(value);
  if (value === "" || value == null || !Number.isFinite(n) || n < min)
    throw Error(label + " is invalid.");
  return n;
}
function date(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || ""))
    throw Error("Choose a valid date.");
  const d = new Date(value + "T12:00:00");
  if (
    Number.isNaN(d.getTime()) ||
    [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0"),
    ].join("-") !== value
  )
    throw Error("Choose a valid date.");
  return value;
}
export function quoteCalculation(data, input) {
  const recipe = data.recipes.find((r) => r.id === input.recipeId);
  if (!recipe || !recipe.lines.length)
    throw Error("Choose a recipe with ingredients.");
  if (
    recipe.lines.some(
      (l) => data.items.find((i) => i.id === l.itemId)?.needsPrice,
    )
  )
    throw Error("Set purchase prices before quoting.");
  const portions = number(input.portions, "Portions", 1);
  if (!Number.isInteger(portions) || !(recipe.yield > 0))
    throw Error("Enter whole portions and a valid recipe yield.");
  const margin = number(input.margin, "Margin");
  const taxRate = number(input.taxRate, "Tax rate");
  if (margin >= 100 || taxRate > 100)
    throw Error("Margin must be below 100%; tax cannot exceed 100%.");
  const batches = Math.ceil(portions / recipe.yield);
  const cost =
    number(fullCost(recipe, data.items, data.settings), "Recipe cost") *
      batches +
    number(input.extraCost, "Extra cost");
  const subtotal = Math.round((cost / (1 - margin / 100)) * 100) / 100;
  const taxDetails = customerTax(subtotal, taxRate);
  const tax = taxDetails.tax;
  return {
    recipeName: recipe.name,
    portions,
    batches,
    producedPortions: batches * recipe.yield,
    cost,
    subtotal,
    tax,
    taxRate,
    total: taxDetails.total,
    unitPrice: subtotal / portions,
    profit: subtotal - cost,
  };
}
export function saveQuote(data, input, id) {
  const snapshot = quoteCalculation(data, input);
  const quote = {
    ...input,
    date: date(input.date),
    id: id || crypto.randomUUID(),
    snapshot,
    updatedAt: new Date().toISOString(),
  };
  return {
    ...data,
    quotes: [...(data.quotes || []).filter((q) => q.id !== quote.id), quote],
  };
}
export function savePlan(data, input, id) {
  if (!data.recipes.some((r) => r.id === input.recipeId))
    throw Error("Choose a recipe.");
  const batches = number(input.batches, "Batches", 1);
  if (!Number.isInteger(batches)) throw Error("Enter whole batches.");
  if (
    id &&
    (data.productionPlans || []).find((p) => p.id === id)?.status ===
      "completed"
  )
    throw Error("Completed production cannot be edited.");
  const plan = {
    ...(data.productionPlans || []).find((p) => p.id === id),
    ...input,
    batches,
    date: date(input.date),
    id: id || crypto.randomUUID(),
    status: "planned",
  };
  return {
    ...data,
    productionPlans: [
      ...(data.productionPlans || []).filter((p) => p.id !== plan.id),
      plan,
    ],
  };
}
export function completePlan(data, id) {
  const plan = (data.productionPlans || []).find((p) => p.id === id);
  if (!plan || plan.status !== "planned")
    throw Error("This plan is no longer pending.");
  const recipe = data.recipes.find((r) => r.id === plan.recipeId);
  const next = produce(data, plan.recipeId, plan.batches);
  return {
    ...next,
    productionPlans: data.productionPlans.map((p) =>
      p.id === id
        ? {
            ...p,
            status: "completed",
            completedAt: new Date().toISOString(),
            recipeName: recipe.name,
            producedPortions: recipe.yield * p.batches,
          }
        : p,
    ),
  };
}
export function inventoryForecast(data, through = localDate()) {
  date(through);
  const demand = {},
    errors = [];
  const plans = (data.productionPlans || [])
    .filter((p) => p.status === "planned" && p.date <= through)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const p of plans) {
    try {
      date(p.date);
      if (!Number.isInteger(p.batches) || p.batches < 1)
        throw Error("Invalid batch count");
      const recipe = data.recipes.find((r) => r.id === p.recipeId);
      if (!recipe || !recipe.lines.length)
        throw Error("Recipe is missing or empty");
      const needs = requirements(recipe, data.items);
      for (const [id, n] of Object.entries(needs)) {
        const item = data.items.find((i) => i.id === id);
        const d = demand[id] || { needed: 0, shortageDate: null };
        d.needed += n * p.batches;
        if (!d.shortageDate && d.needed > (item.stock || 0) + 1e-9)
          d.shortageDate = p.date;
        demand[id] = d;
      }
    } catch (e) {
      errors.push({ id: p.id, message: p.date + ": " + e.message });
    }
  }
  const items = data.items.map((i) => {
    const d = demand[i.id] || { needed: 0, shortageDate: null };
    const stock = i.stock || 0;
    const shortage = Math.max(0, d.needed - stock);
    const packages = Math.ceil(shortage / i.amount - 1e-9);
    return {
      ...i,
      ...d,
      stock,
      shortage,
      packages: Math.max(0, packages),
      remaining: stock - d.needed,
    };
  });
  return { items, errors, plans };
}
