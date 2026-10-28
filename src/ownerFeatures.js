import { fullCost } from "./operations.js";
import { saleRevenue } from "./taxation.js";
import { validDate } from "./business.js";

const positiveNumber = (value, label) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) throw Error(`Enter a valid ${label}.`);
  return number;
};

export function dailySnapshot(data, date) {
  validDate(date);
  const sales = (data.sales || []).filter((sale) => sale.date === date);
  const expenses = (data.expenses || []).filter((expense) => expense.date === date);
  const payments = (data.payments || []).filter((payment) => payment.date === date);
  const batches = (data.productionBatches || []).filter((batch) => batch.producedAt === date);
  const revenue = sales.reduce((sum, sale) => sum + saleRevenue(sale), 0);
  const productionCost = sales.reduce((sum, sale) => sum + (sale.cost || 0), 0);
  const operatingCost = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const cashReceived = payments.reduce(
    (sum, payment) => sum + (payment.kind === "refund" ? -payment.amount : payment.amount),
    0,
  );
  return {
    date,
    sales,
    expenses,
    payments,
    batches,
    revenue,
    productionCost,
    operatingCost,
    profit: revenue - productionCost - operatingCost,
    tax: sales.reduce((sum, sale) => sum + (sale.tax || 0), 0),
    cashReceived,
    portions: sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0),
  };
}

export function priceChanges(data) {
  const grouped = new Map();
  for (const row of [...(data.purchaseHistory || [])].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = `${row.itemId || row.itemName}|${row.supplier || ""}`;
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  }
  return [...grouped.values()]
    .filter((rows) => rows.length > 1)
    .map((rows) => {
      const previous = rows.at(-2);
      const latest = rows.at(-1);
      const before = Number(previous.finalPackageCost ?? previous.packagePrice) || 0;
      const now = Number(latest.finalPackageCost ?? latest.packagePrice) || 0;
      return {
        itemName: latest.itemName,
        supplier: latest.supplier || "Unassigned supplier",
        previous: before,
        latest: now,
        date: latest.date,
        change: now - before,
        percent: before ? ((now - before) / before) * 100 : 0,
      };
    })
    .filter((row) => Math.abs(row.change) > 0.004)
    .sort((a, b) => b.percent - a.percent);
}

export function expiryRecipeSuggestions(data, day, windowDays = 14) {
  validDate(day);
  const endDate = new Date(`${day}T12:00:00`);
  endDate.setDate(endDate.getDate() + windowDays);
  const end = endDate.toLocaleDateString("en-CA");
  const expiring = (data.inventoryLots || []).filter(
    (lot) => lot.remaining > 0 && lot.expiryDate && lot.expiryDate >= day && lot.expiryDate <= end,
  );
  const ids = new Set(expiring.map((lot) => lot.itemId));
  const recipes = (data.recipes || [])
    .map((recipe) => {
      const matches = recipe.lines.filter((line) => ids.has(line.itemId));
      return {
        recipe,
        matches: matches.map((line) => data.items.find((item) => item.id === line.itemId)).filter(Boolean),
      };
    })
    .filter((entry) => entry.matches.length)
    .sort((a, b) => b.matches.length - a.matches.length || a.recipe.name.localeCompare(b.recipe.name));
  return { end, expiring, recipes };
}

export const packingSteps = [
  "Correct box or container",
  "Product and date label",
  "Allergen note checked",
  "Accessories and utensils",
  "Final appearance check",
  "Customer name and pickup time",
];

export function togglePackingStep(data, orderId, step) {
  if (!packingSteps.includes(step)) throw Error("Unknown packing step.");
  const order = (data.orders || []).find((item) => item.id === orderId);
  if (!order) throw Error("Order is missing.");
  const checked = new Set(order.packingChecklist || []);
  if (checked.has(step)) checked.delete(step);
  else checked.add(step);
  return {
    ...data,
    orders: data.orders.map((item) =>
      item.id === orderId ? { ...item, packingChecklist: [...checked] } : item,
    ),
  };
}

export function recordActualYield(data, batchId, actualYield, note = "") {
  const value = Number(actualYield);
  if (!Number.isFinite(value) || value < 0) throw Error("Enter a valid actual yield.");
  if (!(data.productionBatches || []).some((batch) => batch.id === batchId))
    throw Error("Production batch is missing.");
  return {
    ...data,
    productionBatches: data.productionBatches.map((batch) =>
      batch.id === batchId
        ? { ...batch, actualYield: value, yieldNote: note.trim(), yieldRecordedAt: new Date().toISOString() }
        : batch,
    ),
  };
}

export function saveSeasonalPlan(data, input, id = "") {
  const recipe = data.recipes.find((item) => item.id === input.recipeId);
  if (!recipe) throw Error("Choose a recipe.");
  const startDate = validDate(input.startDate);
  const endDate = validDate(input.endDate);
  if (endDate < startDate) throw Error("End date must be on or after the start date.");
  const targetPortions = positiveNumber(input.targetPortions, "portion target");
  const title = input.title?.trim();
  if (!title) throw Error("Enter a season or event name.");
  const plan = {
    id: id || crypto.randomUUID(),
    title,
    startDate,
    endDate,
    recipeId: recipe.id,
    recipeName: recipe.name,
    targetPortions,
    batches: Math.ceil(targetPortions / recipe.yield),
    notes: input.notes?.trim() || "",
  };
  return {
    ...data,
    seasonalPlans: [
      ...(data.seasonalPlans || []).filter((item) => item.id !== plan.id),
      plan,
    ],
  };
}

export function removeSeasonalPlan(data, id) {
  return { ...data, seasonalPlans: (data.seasonalPlans || []).filter((item) => item.id !== id) };
}

export function saveScalingPreset(data, input) {
  const name = input.name?.trim();
  const portions = positiveNumber(input.portions, "preset portions");
  if (!name) throw Error("Enter a preset name.");
  const preset = { id: crypto.randomUUID(), name, portions };
  return { ...data, scalingPresets: [...(data.scalingPresets || []), preset] };
}

export function removeScalingPreset(data, id) {
  return { ...data, scalingPresets: (data.scalingPresets || []).filter((preset) => preset.id !== id) };
}

export function savePurchaseOrder(data, throughDate, rows) {
  validDate(throughDate);
  if (!rows.length) throw Error("The shopping list is empty.");
  const order = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    throughDate,
    status: "draft",
    rows: structuredClone(rows),
    estimatedTotal: rows.reduce((sum, row) => sum + (row.estimate || 0), 0),
  };
  return { ...data, purchaseOrders: [...(data.purchaseOrders || []), order] };
}

export function removePurchaseOrder(data, id) {
  return { ...data, purchaseOrders: (data.purchaseOrders || []).filter((order) => order.id !== id) };
}

export function seasonalPlanCost(data, plan) {
  const recipe = data.recipes.find((item) => item.id === plan.recipeId);
  if (!recipe) return null;
  try {
    return fullCost(recipe, data.items, data.settings) * plan.batches;
  } catch {
    return null;
  }
}
