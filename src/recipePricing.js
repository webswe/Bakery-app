import { lineCost } from "./costing.js";
import {
  evaluateListPrice,
  normalizePricingPolicy,
  normalizeUnitsPerOrder,
  priceForMargin,
} from "./pricingStrategy.js";
import { customerTax } from "./taxation.js";

const saleFormats = {
  individual: "individual dessert",
  slice: "slice",
  box: "box",
  tray: "tray",
  dozen: "dozen",
  custom: "selling unit",
};

const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, finite(value, minimum)));

export function recipeSaleDetails(recipe = {}) {
  const format = Object.hasOwn(saleFormats, recipe.saleFormat)
    ? recipe.saleFormat
    : "individual";
  const quantity =
    format === "dozen" ? 12 : Math.max(1, finite(recipe.saleQuantity, 1));
  const unitPrice = Math.max(0, finite(recipe.price));
  const salePrice = Number.isFinite(Number(recipe.salePrice))
    ? Math.max(0, Number(recipe.salePrice))
    : unitPrice * quantity;
  return { format, quantity, unitPrice, salePrice, label: saleFormats[format] };
}

export function recipeSellingCapacity(recipe = {}) {
  const sale = recipeSaleDetails(recipe);
  const yieldAmount = Math.max(1, finite(recipe.yield, 1));
  const wholeSaleUnits = Math.floor(yieldAmount / sale.quantity + 1e-10);
  const sellableUnits = Math.max(1, wholeSaleUnits);
  return {
    ...sale,
    yieldAmount,
    wholeSaleUnits,
    sellableUnits,
    unallocatedPortions: Math.max(
      0,
      yieldAmount - wholeSaleUnits * sale.quantity,
    ),
    portionsShort: Math.max(0, sale.quantity - yieldAmount),
  };
}

export function recipeCostDetails(recipe, items, settings = {}) {
  const lines = (recipe.lines || []).reduce(
    (totals, line) => {
      const item = items.find((entry) => entry.id === line.itemId);
      const amount = lineCost(line, items).cost;
      totals[item?.type === "packaging" ? "packaging" : "ingredients"] +=
        amount;
      return totals;
    },
    { ingredients: 0, packaging: 0 },
  );
  const labor =
    (Math.max(0, finite(recipe.laborMinutes)) / 60) *
    Math.max(0, finite(settings.hourlyWage));
  const electricity =
    Math.max(0, finite(recipe.electricityKwh)) *
    Math.max(0, finite(settings.electricityRate));
  const overhead = Math.max(0, finite(recipe.overheadPerBatch));
  const total =
    lines.ingredients + lines.packaging + labor + electricity + overhead;
  const capacity = recipeSellingCapacity(recipe);
  const revenue = capacity.salePrice * capacity.wholeSaleUnits;
  const profit = revenue - total;
  return {
    ...lines,
    ...capacity,
    labor,
    electricity,
    overhead,
    total,
    variableTotal: total - overhead,
    perPortion: total / capacity.yieldAmount,
    costPerSellingUnit: total / capacity.sellableUnits,
    revenue,
    profit,
    margin: revenue > 0 ? (profit / revenue) * 100 : 0,
  };
}

export function recipePricingPlan(recipe, items, settings = {}, input = {}) {
  const costs = recipeCostDetails(recipe, items, settings);
  const policy = {
    ...normalizePricingPolicy(settings),
    ...(recipe.pricingPlan || {}),
    ...(input || {}),
  };
  const targetMargin = clamp(policy.targetMargin, 0, 90);
  const minimumMargin = Math.min(
    targetMargin,
    clamp(policy.minimumMargin, 0, 90),
  );
  const wastePercent = clamp(policy.wastePercent, 0, 100);
  const processorFeePercent = clamp(policy.processorFeePercent, 0, 50);
  const processorFixedFee = Math.max(0, finite(policy.processorFixedFee));
  const discountPercent = clamp(policy.discountPercent, 0, 90);
  const unitsPerOrder = normalizeUnitsPerOrder(policy.unitsPerOrder);
  const fixedFeePerUnit = processorFixedFee / unitsPerOrder;
  const roundTo = Math.max(0.01, finite(policy.roundTo, 0.5));
  const bufferedBatchCost = costs.total * (1 + wastePercent / 100);
  const costPerSellingUnit = bufferedBatchCost / costs.sellableUnits;
  const pricingInput = {
    cost: costPerSellingUnit,
    processorFeePercent,
    processorFixedFee: fixedFeePerUnit,
    discountPercent,
    roundTo,
  };
  const recommendation = priceForMargin({
    ...pricingInput,
    targetMargin,
  });
  const minimum = priceForMargin({
    ...pricingInput,
    targetMargin: minimumMargin,
  });
  const current = evaluateListPrice({
    ...pricingInput,
    listPrice: costs.salePrice,
  });
  const salesTaxRate = clamp(policy.salesTaxRate, 0, 100);
  const suggestedSale = recommendation.listPrice;
  const suggestedPortion = suggestedSale / costs.quantity;
  const customerTotal = customerTax(suggestedSale, salesTaxRate).total;
  const laborHours = Math.max(0, finite(recipe.laborMinutes)) / 60;
  return {
    ...costs,
    targetMargin,
    minimumMargin,
    wastePercent,
    processorFeePercent,
    processorFixedFee,
    unitsPerOrder,
    fixedFeePerUnit,
    discountPercent,
    roundTo: recommendation.roundTo,
    bufferedBatchCost,
    costPerSellingUnit,
    current,
    minimumPrice: minimum.listPrice,
    suggestedPortion,
    suggestedSale,
    customerTotal,
    salesTaxRate,
    suggestedRevenue: recommendation.realizedRevenue,
    suggestedProcessingFee: recommendation.processingFee,
    suggestedProfit: recommendation.profit,
    suggestedMargin: recommendation.margin,
    suggestedMarkup: recommendation.markup,
    priceGap: suggestedSale - costs.salePrice,
    minimumGap: minimum.listPrice - costs.salePrice,
    belowMinimum: current.margin < minimumMargin,
    margin: current.margin,
    batchProfit: current.profit * costs.wholeSaleUnits,
    suggestedBatchProfit: recommendation.profit * costs.sellableUnits,
    profitPerLaborHour:
      laborHours > 0
        ? (current.profit * costs.wholeSaleUnits) / laborHours
        : null,
  };
}
