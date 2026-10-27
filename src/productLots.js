const day = (value) => value || new Date().toLocaleDateString("en-CA");

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
    usage: [...usage].map(([productLotId, amount]) => ({ productLotId, amount })),
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
