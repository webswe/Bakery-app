import { purchaseTax } from "./taxation.js";
export const units = {
  g: ["mass", 1],
  kg: ["mass", 1000],
  oz: ["mass", 28.349523125],
  lb: ["mass", 453.59237],
  ml: ["volume", 1],
  l: ["volume", 1000],
  floz: ["volume", 29.5735295625],
  cup: ["volume", 236.5882365],
  tbsp: ["volume", 14.7867648],
  tsp: ["volume", 4.92892159],
  pint: ["volume", 473.176473],
  quart: ["volume", 946.352946],
  gallon: ["volume", 3785.411784],
  each: ["count", 1],
  can: ["can", 1],
  stick: ["stick", 1],
};
export const unitLabels = {
  g: "grams (g)",
  kg: "kilograms (kg)",
  oz: "ounces (oz)",
  lb: "pounds (lb)",
  ml: "milliliters (ml)",
  l: "liters (L)",
  floz: "fluid ounces (fl oz)",
  cup: "US cups",
  tbsp: "US tablespoons (tbsp)",
  tsp: "US teaspoons (tsp)",
  pint: "US pints",
  quart: "US quarts",
  gallon: "US gallons",
  each: "each",
  can: "can",
  stick: "stick",
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
  const price = purchaseTax(item).total;
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
    : item.gramsPerTbsp
      ? item.gramsPerTbsp / units.tbsp[1]
      : item.gramsPerTsp
        ? item.gramsPerTsp / units.tsp[1]
        : item.density;
  const weight = (unit) =>
    unit === "can"
      ? item.gramsPerCan
      : unit === "each"
        ? item.gramsPerEach
        : unit === "stick"
          ? item.gramsPerStick
          : null;
  const weightLabel = (unit) =>
    ({
      can: "grams per can",
      each: "grams per piece",
      stick: "grams per stick",
    })[unit] || "weight";
  const measureWeight = (unit) =>
    ({
      cup: item.gramsPerCup,
      tbsp: item.gramsPerTbsp,
      tsp: item.gramsPerTsp,
    })[unit] || null;
  let source = from,
    value = +amount;
  if (["can", "each", "stick"].includes(from)) {
    if (!(weight(from) > 0))
      throw Error(`Set ${weightLabel(from)} for this ingredient.`);
    source = "g";
    value *= weight(from);
  }
  if (["can", "each", "stick"].includes(to)) {
    if (!(weight(to) > 0))
      throw Error(`Set ${weightLabel(to)} for this ingredient.`);
    const grams =
      units[source][0] === "volume" && measureWeight(source)
        ? value * measureWeight(source)
        : convert(value, source, "g", density);
    return grams / weight(to);
  }
  if (
    units[source][0] === "volume" &&
    units[to][0] === "mass" &&
    measureWeight(source)
  )
    return convert(value * measureWeight(from), "g", to, density);
  if (
    units[source][0] === "mass" &&
    units[to][0] === "volume" &&
    measureWeight(to)
  )
    return convert(value, source, "g", density) / measureWeight(to);
  return convert(value, source, to, density);
}
