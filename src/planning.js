import { customerTax } from "./taxation.js";
import { requirements, fullCost, produce } from "./operations.js";
import { ensureCustomer } from "./customerOps.js";
import { allocateDocumentNumber } from "./documentOps.js";
import { normalizePricingPolicy, priceForMargin } from "./pricingStrategy.js";

const moneyRound = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

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
  const baseCost = moneyRound(
    number(fullCost(recipe, data.items, data.settings), "Recipe cost") *
      batches +
      number(input.extraCost, "Extra cost"),
  );
  const oneOffPurchase = number(input.oneOffPurchase ?? 0, "One-off purchase");
  const oneOffReusable = number(input.oneOffReusable ?? 0, "Reusable value");
  if (oneOffReusable > oneOffPurchase)
    throw Error("Reusable value cannot exceed the one-off purchase cost.");
  const oneOffRecovery = moneyRound(oneOffPurchase - oneOffReusable);
  const savedPolicy = data.settings?.pricingGuide;
  const policy = normalizePricingPolicy(data.settings);
  const wastePercent = savedPolicy ? policy.wastePercent : 0;
  const cost = moneyRound(baseCost * (1 + wastePercent / 100) + oneOffRecovery);
  const priced = priceForMargin({
    cost,
    targetMargin: margin,
    processorFeePercent: savedPolicy ? policy.processorFeePercent : 0,
    processorFixedFee: savedPolicy ? policy.processorFixedFee : 0,
    discountPercent: 0,
    roundTo: savedPolicy ? policy.roundTo : 0.01,
  });
  const subtotal = priced.listPrice;
  const taxDetails = customerTax(subtotal, taxRate);
  const tax = taxDetails.tax;
  return {
    recipeName: recipe.name,
    portions,
    batches,
    producedPortions: batches * recipe.yield,
    baseCost,
    ...(oneOffRecovery > 0 ? { oneOffRecovery } : {}),
    cost,
    wastePercent,
    processingFee: priced.processingFee,
    subtotal,
    tax,
    taxRate,
    total: taxDetails.total,
    unitPrice: subtotal / portions,
    profit: priced.profit,
    margin: priced.margin,
  };
}
export function saveQuote(data, input, id) {
  const snapshot = quoteCalculation(data, input);
  const quoteDate = date(input.date);
  const customerResult = ensureCustomer(data, input);
  const previous = (data.quotes || []).find((quote) => quote.id === id);
  const allocation = previous?.quoteNumber
    ? {
        number: previous.quoteNumber,
        documentCounters: customerResult.data.documentCounters,
      }
    : allocateDocumentNumber(customerResult.data, "quote", quoteDate);
  const quote = {
    ...input,
    customer: String(input.customer || "").trim(),
    customerId: customerResult.customerId,
    date: quoteDate,
    id: id || crypto.randomUUID(),
    quoteNumber: allocation.number,
    snapshot,
    updatedAt: new Date().toISOString(),
  };
  return {
    ...customerResult.data,
    documentCounters: allocation.documentCounters,
    quotes: [
      ...(customerResult.data.quotes || []).filter((q) => q.id !== quote.id),
      quote,
    ],
  };
}
export function savePlan(data, input, id) {
  const recipe = data.recipes.find((r) => r.id === input.recipeId);
  if (!recipe) throw Error("Choose a recipe.");
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
    recipeSnapshot: input.recipeSnapshot ||
      (data.productionPlans || []).find((p) => p.id === id)?.recipeSnapshot || {
        capturedAt: new Date().toISOString(),
        recipe: structuredClone(recipe),
        items: recipe.lines.map((line) => {
          const item = data.items.find((i) => i.id === line.itemId);
          return item ? structuredClone(item) : null;
        }),
        batchCost: fullCost(recipe, data.items, data.settings),
        settings: structuredClone(data.settings),
      },
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
  const recipe =
    plan.recipeSnapshot?.recipe ||
    data.recipes.find((r) => r.id === plan.recipeId);
  const snapshotItems = plan.recipeSnapshot?.items?.filter(Boolean);
  const next = produce(
    data,
    plan.recipeId,
    plan.batches,
    recipe,
    snapshotItems,
    plan.recipeSnapshot?.batchCost,
    {
      productionDate: plan.date,
      productionPlanId: plan.id,
      orderId: plan.orderId || "",
    },
  );
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
      const recipe =
        p.recipeSnapshot?.recipe ||
        data.recipes.find((r) => r.id === p.recipeId);
      if (!recipe || !recipe.lines.length)
        throw Error("Recipe is missing or empty");
      const snapshotItems = p.recipeSnapshot?.items?.filter(Boolean);
      const planningItems = snapshotItems?.length
        ? data.items.map((item) => ({
            ...item,
            ...(snapshotItems.find((snap) => snap.id === item.id) || {}),
            stock: item.stock,
          }))
        : data.items;
      const needs = requirements(recipe, planningItems);
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
