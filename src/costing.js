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
  can: ["can", 1],
};
export function convert(amount, from, to, density) {
  const a = units[from],
    b = units[to];
  if (!a || !b) throw Error("Unknown unit");
  let base = Number(amount) * a[1];
  if (a[0] !== b[0]) {
    if (
      !density ||
      a[0] === "count" ||
      b[0] === "count" ||
      a[0] === "can" ||
      b[0] === "can"
    )
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
  const needed = convertItem(line.amount, line.unit, item.unit, item);
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

export function convertItem(amount, from, to, item = {}) {
  if (!Number.isFinite(+amount) || +amount < 0)
    throw Error("Enter a nonnegative quantity.");
  if (!units[from] || !units[to]) throw Error("Unknown unit");
  if (from === to) return +amount;
  const density = item.gramsPerCup
    ? item.gramsPerCup / units.cup[1]
    : item.density;
  const weight = (unit) =>
    unit === "can"
      ? item.gramsPerCan
      : unit === "each"
        ? item.gramsPerEach
        : null;
  let source = from,
    value = +amount;
  if (from === "can" || from === "each") {
    if (!(weight(from) > 0))
      throw Error(
        from === "can"
          ? "Set grams per can for this ingredient."
          : "Set grams per piece for this ingredient.",
      );
    source = "g";
    value *= weight(from);
  }
  if (to === "can" || to === "each") {
    if (!(weight(to) > 0))
      throw Error(
        to === "can"
          ? "Set grams per can for this ingredient."
          : "Set grams per piece for this ingredient.",
      );
    return convert(value, source, "g", density) / weight(to);
  }
  return convert(value, source, to, density);
}
