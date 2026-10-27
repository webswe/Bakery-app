export const units = {
  g: ["mass", 1],
  kg: ["mass", 1000],
  oz: ["mass", 28.349523125],
  lb: ["mass", 453.59237],
  ml: ["volume", 1],
  l: ["volume", 1000],
  cup: ["volume", 236.5882365],
  tbsp: ["volume", 14.7867648],
  tsp: ["volume", 4.92892159],
  each: ["count", 1],
};
export function convert(amount, from, to, density) {
  const a = units[from],
    b = units[to];
  if (!a || !b) throw Error("Unknown unit");
  let base = Number(amount) * a[1];
  if (a[0] !== b[0]) {
    if (!density || a[0] === "count" || b[0] === "count")
      throw Error(
        "Add grams per cup, density (g/ml), or grams per piece for this conversion.",
      );
    base = a[0] === "volume" ? base * density : base / density;
  }
  return base / b[1];
}
export function lineCost(line, items) {
  const item = items.find((i) => i.id === line.itemId);
  if (!item) throw Error("Ingredient or packaging item is missing.");
  if (!Number.isFinite(+line.amount) || +line.amount <= 0 || !(item.amount > 0))
    throw Error("Quantities must be positive.");
  const density = item.gramsPerCup
    ? item.gramsPerCup / units.cup[1]
    : item.density;
  let needed;
  if (line.unit === "each" && item.unit !== "each" && item.gramsPerEach)
    needed = convert(line.amount * item.gramsPerEach, "g", item.unit, density);
  else if (item.unit === "each" && line.unit !== "each" && item.gramsPerEach)
    needed = convert(line.amount, line.unit, "g", density) / item.gramsPerEach;
  else needed = convert(line.amount, line.unit, item.unit, density);
  const packs = needed / item.amount;
  const price = item.price * (item.taxIncluded ? 1 : 1 + item.tax / 100);
  return {
    needed,
    unit: item.unit,
    cost: packs * price,
    packs: Math.ceil(packs - 1e-10),
    purchase: Math.ceil(packs - 1e-10) * price,
  };
}
export function recipeCost(recipe, items) {
  return recipe.lines.reduce((s, l) => s + lineCost(l, items).cost, 0);
}
