import { lineCost } from "./costing.js";

export const saleFormats = {
  individual: "individual dessert",
  slice: "slice",
  box: "box",
  tray: "tray",
  dozen: "dozen",
  custom: "selling unit",
};

export function recipeSaleDetails(recipe = {}) {
  const format = Object.hasOwn(saleFormats, recipe.saleFormat) ? recipe.saleFormat : "individual";
  const quantity = format === "dozen" ? 12 : Math.max(1, Number(recipe.saleQuantity) || 1);
  const unitPrice = Math.max(0, Number(recipe.price) || 0);
  const salePrice = Number.isFinite(Number(recipe.salePrice)) ? Math.max(0, Number(recipe.salePrice)) : unitPrice * quantity;
  return { format, quantity, unitPrice, salePrice, label: saleFormats[format] };
}

export function recipeCostDetails(recipe, items, settings = {}) {
  const lines = recipe.lines.reduce((totals, line) => {
    const item = items.find((entry) => entry.id === line.itemId);
    const amount = lineCost(line, items).cost;
    totals[item?.type === "packaging" ? "packaging" : "ingredients"] += amount;
    return totals;
  }, { ingredients: 0, packaging: 0 });
  const labor = ((Number(recipe.laborMinutes) || 0) / 60) * (Number(settings.hourlyWage) || 0);
  const electricity = (Number(recipe.electricityKwh) || 0) * (Number(settings.electricityRate) || 0);
  const overhead = Number(recipe.overheadPerBatch) || 0;
  const total = lines.ingredients + lines.packaging + labor + electricity + overhead;
  const yieldAmount = Math.max(1, Number(recipe.yield) || 1);
  const revenue = (Number(recipe.price) || 0) * yieldAmount;
  const profit = revenue - total;
  return { ...lines, labor, electricity, overhead, total, perPortion: total / yieldAmount, revenue, profit, margin: revenue > 0 ? profit / revenue * 100 : 0 };
}
