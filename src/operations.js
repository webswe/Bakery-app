import { directSaleTotals } from "./taxation.js";
import { consumeManyLots } from "./inventoryLots.js";
import { lineCost, recipeCost } from "./costing.js";
export const presets = [
  ["All-purpose flour", 120],
  ["Bread flour", 120],
  ["Cake flour", 114],
  ["Whole wheat flour", 113],
  ["Granulated sugar", 200],
  ["Brown sugar (packed)", 213],
  ["Powdered sugar", 113],
  ["Unsalted butter", 227],
  ["Salted butter", 227],
  ["Milk", 244],
  ["Heavy cream", 238],
  ["Condensed milk", 306],
  ["Evaporated milk", 252],
  ["Cocoa powder", 85],
  ["Chocolate chips", 170],
  ["Vegetable oil", 198],
  ["Honey", 340],
  ["Maple syrup", 312],
  ["Rolled oats", 89],
  ["Cornstarch", 128],
  ["Baking powder", 192],
  ["Baking soda", 230],
  ["Fine salt", 288],
  ["Vanilla extract", 208],
  ["Peanut butter", 270],
  ["Cream cheese", 227],
  ["Yogurt", 245],
  ["Almond flour", 96],
  ["Shredded coconut", 85],
  ["Eggs", null],
];
export function addPresets(data) {
  const names = new Set(data.items.map((i) => i.name.toLowerCase()));
  return {
    ...data,
    items: [
      ...data.items,
      ...presets
        .filter(([name]) => !names.has(name.toLowerCase()))
        .map(([name, gramsPerCup]) => ({
          id: crypto.randomUUID(),
          name,
          gramsPerCup,
          gramsPerCan:
            name === "Condensed milk"
              ? 397
              : name === "Evaporated milk"
                ? 354
                : null,
          unit: name === "Eggs" ? "each" : "g",
          amount: name === "Eggs" ? 12 : 1000,
          price: 0,
          needsPrice: true,
          taxMode: "added",
          taxIncluded: false,
          tax: data.taxRates?.food ?? 0,
          taxCategory: "food",
          type: "ingredient",
          stock: 0,
          gramsPerEach: name === "Eggs" ? 50 : null,
        })),
    ],
  };
}
export function requirements(recipe, items) {
  const result = {};
  for (const line of recipe.lines) {
    const { needed } = lineCost(line, items);
    result[line.itemId] = (result[line.itemId] || 0) + needed;
  }
  return result;
}
export function availability(recipe, items) {
  try {
    const needs = requirements(recipe, items);
    if (!Object.keys(needs).length) throw Error("Recipe has no items");
    const batches = Math.max(
      0,
      Math.floor(
        Math.min(
          ...Object.entries(needs).map(
            ([id, n]) => (items.find((i) => i.id === id).stock || 0) / n,
          ),
        ) + 1e-9,
      ),
    );
    return { batches, portions: batches * recipe.yield, needs };
  } catch (e) {
    return { batches: 0, portions: 0, error: e.message };
  }
}
export function fullCost(recipe, items, settings = {}) {
  return (
    recipeCost(recipe, items) +
    ((recipe.laborMinutes || 0) / 60) * (settings.hourlyWage || 0) +
    (recipe.electricityKwh || 0) * (settings.electricityRate || 0) +
    (recipe.overheadPerBatch || 0)
  );
}
export function produce(
  data,
  id,
  batches,
  recipeOverride,
  itemSnapshots,
  snapshotBatchCost,
) {
  if (!Number.isInteger(batches) || batches < 1)
    throw Error("Enter a whole number of batches.");
  const r = recipeOverride || data.recipes.find((x) => x.id === id);
  if (!r) throw Error("Recipe missing");
  const costingItems = itemSnapshots?.length
    ? data.items.map(
        (item) => itemSnapshots.find((snap) => snap.id === item.id) || item,
      )
    : data.items;
  const availabilityItems = itemSnapshots?.length
    ? data.items.map((item) => ({
        ...item,
        ...(itemSnapshots.find((snap) => snap.id === item.id) || {}),
        stock: item.stock,
        needsPrice: item.needsPrice,
      }))
    : data.items;
  const a = availability(r, availabilityItems);
  if (a.error) throw Error(a.error);
  if (a.batches < batches)
    throw Error("Insufficient ingredients or packaging.");
  if (
    r.lines.some(
      (l) => data.items.find((i) => i.id === l.itemId)?.needsPrice,
    )
  )
    throw Error("Set purchase prices for all recipe items first.");
  const quantity = batches * r.yield,
    cost =
      (snapshotBatchCost ?? fullCost(r, costingItems, data.settings)) * batches,
    old = data.products[id] || { quantity: 0, value: 0 };
  const lotResult = consumeManyLots(data, a.needs, batches);
  return {
    ...data,
    items: data.items.map((i) => ({
      ...i,
      stock: Math.max(0, (i.stock || 0) - (a.needs[i.id] || 0) * batches),
    })),
    products: {
      ...data.products,
      [id]: { quantity: old.quantity + quantity, value: old.value + cost },
    },
    inventoryLots: lotResult.lots,
    movements: [
      ...(data.movements || []),
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        name: r.name,
        quantity,
        kind: "Production",
        lotUsage: lotResult.usage,
      },
    ],
  };
}
export function sell(data, f) {
  const r = data.recipes.find((x) => x.id === f.recipe),
    quantity = +f.quantity;
  if (
    !r ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !Number.isFinite(+f.total) ||
    +f.total < 0
  )
    throw Error("Enter a valid sale.");
  const stock = data.products[r.id] || { quantity: 0, value: 0 };
  if (quantity > stock.quantity)
    throw Error(
      "Not enough finished product. Complete production in the production plan first.",
    );
  let breakdown;
  if (f.taxSnapshot) {
    const t = f.taxSnapshot;
    if (
      ![t.net, t.tax, t.taxRate].every(Number.isFinite) ||
      t.net < 0 ||
      t.tax < 0 ||
      t.taxRate < 0 ||
      t.taxRate > 100 ||
      Math.abs(t.net + t.tax - Number(f.total)) > 0.005
    )
      throw Error("Invalid saved order tax breakdown.");
    breakdown = { ...t, total: +f.total };
  } else if (f.taxRate !== undefined)
    breakdown = directSaleTotals(
      r.price,
      quantity,
      Number(f.discount || 0),
      f.taxRate,
    );
  const cost = (stock.value / stock.quantity) * quantity;
  return {
    ...data,
    products: {
      ...data.products,
      [r.id]: {
        quantity: stock.quantity - quantity,
        value: Math.max(0, stock.value - cost),
      },
    },
    sales: [
      ...data.sales,
      {
        id: crypto.randomUUID(),
        date: f.date,
        recipeId: r.id,
        name: r.name,
        quantity,
        total: +f.total,
        ...breakdown,
        cost,
        stockTracked: true,
        customer: f.customer || "",
        payment: f.payment || "Cash",
      },
    ],
  };
}
