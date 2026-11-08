import { localDay } from "./dateUtils.js";

const day = (value) => value || localDay();

export function addDays(value, days) {
  if (!(Number(days) > 0)) return "";
  const date = new Date(day(value) + "T12:00:00");
  date.setDate(date.getDate() + Number(days));
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function createProductLot(recipe, quantity, cost, batchId, producedAt) {
  return {
    id: crypto.randomUUID(),
    batchId,
    recipeId: recipe.id,
    recipeName: recipe.name,
    producedAt: day(producedAt),
    bestBefore: addDays(producedAt, recipe.shelfLifeDays),
    quantity,
    remaining: quantity,
    cost,
    storageInstructions: recipe.storageInstructions?.trim() || "",
  };
}

export function consumeProductLots(lots, recipeId, quantity) {
  let left = Number(quantity);
  const ordered = lots
    .filter((lot) => lot.recipeId === recipeId && lot.remaining > 0)
    .sort(
      (a, b) =>
        (a.bestBefore || "9999-12-31").localeCompare(
          b.bestBefore || "9999-12-31",
        ) || a.producedAt.localeCompare(b.producedAt),
    );
  const usage = new Map();
  for (const lot of ordered) {
    const amount = Math.min(left, lot.remaining);
    if (amount > 0) usage.set(lot.id, amount);
    left -= amount;
    if (left <= 1e-9) break;
  }
  return {
    lots: lots.map((lot) =>
      usage.has(lot.id)
        ? { ...lot, remaining: Math.max(0, lot.remaining - usage.get(lot.id)) }
        : lot,
    ),
    usage: [...usage].map(([productLotId, amount]) => ({
      productLotId,
      amount,
    })),
  };
}

export function finishedProductAlerts(data, today) {
  return (data.productLots || [])
    .filter((lot) => lot.remaining > 0 && lot.bestBefore)
    .map((lot) => ({ ...lot, expired: lot.bestBefore < today }))
    .sort((a, b) => a.bestBefore.localeCompare(b.bestBefore));
}

export function restoreProductLots(lots, usage = []) {
  const restored = new Map(
    usage.map((row) => [row.productLotId, Number(row.amount) || 0]),
  );
  return lots.map((lot) =>
    restored.has(lot.id)
      ? {
          ...lot,
          remaining: Math.min(
            Number.isFinite(lot.quantity) ? lot.quantity : Infinity,
            lot.remaining + restored.get(lot.id),
          ),
        }
      : lot,
  );
}

export function adjustFinishedStock(data, recipeId, input) {
  const recipe = (data.recipes || []).find((row) => row.id === recipeId);
  if (!recipe) throw Error("Finished product recipe is missing.");
  const direction = input.direction;
  if (!["add", "remove"].includes(direction))
    throw Error("Choose whether to add or remove stock.");
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1)
    throw Error("Enter a whole number of portions.");
  const date = input.date || localDay();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw Error("Choose a valid adjustment date.");
  const reason = String(input.reason || "").trim();
  if (!reason) throw Error("Choose or enter a reason.");
  const current = data.products?.[recipeId] || { quantity: 0, value: 0 };
  if (direction === "remove" && quantity > current.quantity)
    throw Error(`Only ${current.quantity} portions are available.`);

  const averageCost = current.quantity
    ? current.value / current.quantity
    : Math.max(0, Number(input.unitCost) || 0);
  const valueChange = averageCost * quantity;
  let productLots = data.productLots || [];
  if (direction === "add") {
    productLots = [
      ...productLots,
      {
        ...createProductLot(
          recipe,
          quantity,
          valueChange,
          `adjustment-${crypto.randomUUID()}`,
          date,
        ),
        adjustment: true,
        adjustmentReason: reason,
      },
    ];
  } else {
    productLots = consumeProductLots(productLots, recipeId, quantity).lots;
  }

  const delta = direction === "add" ? quantity : -quantity;
  return {
    ...data,
    products: {
      ...(data.products || {}),
      [recipeId]: {
        quantity: current.quantity + delta,
        value:
          direction === "add"
            ? current.value + valueChange
            : Math.max(0, current.value - valueChange),
      },
    },
    productLots,
    movements: [
      ...(data.movements || []),
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        effectiveDate: date,
        name: recipe.name,
        recipeId,
        kind:
          direction === "add"
            ? "Finished stock added"
            : "Finished stock removed",
        quantity,
        delta,
        unit: "portions",
        reason,
        note: String(input.note || "").trim(),
      },
    ],
  };
}

export function discardProductLot(data, lotId, input = {}) {
  const lot = (data.productLots || []).find((entry) => entry.id === lotId);
  if (!lot) throw Error("Finished lot is missing.");
  const quantity = Number(lot.remaining) || 0;
  if (!(quantity > 0)) throw Error("This finished lot has no stock left.");
  const current = data.products?.[lot.recipeId] || { quantity: 0, value: 0 };
  if (quantity > current.quantity + 1e-9)
    throw Error("Finished-stock totals no longer match this lot.");
  const unitCost = Number(lot.quantity)
    ? (Number(lot.cost) || 0) / Number(lot.quantity)
    : 0;
  const valueChange = unitCost * quantity;
  const reason = String(input.reason || "Discarded whole baked lot").trim();
  return {
    ...data,
    products: {
      ...(data.products || {}),
      [lot.recipeId]: {
        quantity: Math.max(0, current.quantity - quantity),
        value: Math.max(0, current.value - valueChange),
      },
    },
    productLots: (data.productLots || []).map((entry) =>
      entry.id === lotId
        ? {
            ...entry,
            remaining: 0,
            discardedAt: new Date().toISOString(),
            discardReason: reason,
          }
        : entry,
    ),
    movements: [
      ...(data.movements || []),
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        effectiveDate: input.date || localDay(),
        name: lot.recipeName || "Finished product",
        recipeId: lot.recipeId,
        productLotId: lot.id,
        kind: "Finished lot discarded",
        quantity,
        delta: -quantity,
        unit: "portions",
        reason,
        note: String(input.note || "").trim(),
      },
    ],
  };
}
