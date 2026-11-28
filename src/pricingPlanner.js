import { monthlySummary } from "./analytics.js";
import { saveRecipeRevision } from "./bakeryOperations.js";
import { recipePricingPlan, recipeSaleDetails } from "./recipePricing.js";
import {
  monthlySalesPlan,
  normalizePricingPolicy,
  priceForMargin,
} from "./pricingStrategy.js";
import { customerTax } from "./taxation.js";

export function pricingDeskDefaults(data, recipeId) {
  const recipe = data.recipes.find((row) => row.id === recipeId);
  return {
    ...normalizePricingPolicy({
      ...data.settings,
      pricingGuide: {
        ...data.settings?.pricingGuide,
        ...recipe?.pricingPlan,
      },
    }),
    salesTaxRate: data.salesTaxRate ?? 0,
  };
}

function usablePlan(data, recipe, input) {
  if (!recipe) throw Error("Choose a recipe.");
  if (
    !recipe.lines?.length ||
    !Number.isFinite(Number(recipe.yield)) ||
    !(recipe.yield > 0)
  )
    throw Error("Set up recipe ingredients and a positive batch yield first.");
  const unpriced = data.items.find(
    (item) =>
      item.needsPrice && recipe.lines.some((line) => line.itemId === item.id),
  );
  if (unpriced) throw Error(`Set a purchase price for ${unpriced.name} first.`);
  const unitsPerOrder = Number(input.unitsPerOrder);
  if (
    !Number.isInteger(unitsPerOrder) ||
    unitsPerOrder < 1 ||
    unitsPerOrder > 1000
  )
    throw Error("Enter 1 to 1,000 selling units per order.");

  const plan = recipePricingPlan(recipe, data.items, data.settings, input);
  if (!plan.wholeSaleUnits)
    throw Error(
      `Increase the recipe yield or lower the selling quantity so a batch makes at least one ${plan.label}.`,
    );
  return plan;
}

export function pricingDeskReport(data, recipeId, input = {}, month = "") {
  const recipe = data.recipes.find((row) => row.id === recipeId);
  const policy = { ...pricingDeskDefaults(data, recipeId), ...input };
  const plan = usablePlan(data, recipe, policy);
  const summary = monthlySummary(
    data,
    month || new Date().toISOString().slice(0, 7),
  );
  // Batch overhead repeats with production, in addition to monthly fixed expenses.
  const variableCostPerUnit = plan.costPerSellingUnit;
  const unitContribution =
    plan.suggestedRevenue - plan.suggestedProcessingFee - variableCostPerUnit;
  const monthly = monthlySalesPlan({
    unitRevenue: plan.suggestedRevenue,
    unitProfit: plan.suggestedProfit,
    unitContribution,
    fixedCosts: policy.monthlyFixedCosts,
    revenueGoal: policy.monthlyRevenueGoal,
    profitGoal: policy.monthlyProfitGoal,
    actualRevenue: summary.revenue,
    actualProfit: summary.profit,
    workingDays: policy.workingDays,
  });
  const formula = {
    cost: plan.costPerSellingUnit,
    processorFeePercent: plan.processorFeePercent,
    processorFixedFee: plan.fixedFeePerUnit,
    discountPercent: plan.discountPercent,
    roundTo: plan.roundTo,
  };
  const ladderMargins = [...new Set([20, 30, 35, 40, 50, plan.targetMargin])]
    .filter((value) => value + plan.processorFeePercent < 100)
    .sort((a, b) => a - b);
  const ladder = ladderMargins.map((targetMargin) =>
    priceForMargin({ ...formula, targetMargin }),
  );
  const units = plan.unitsPerOrder;
  const order = {
    units,
    listSubtotal: plan.suggestedSale * units,
    ...customerTax(plan.suggestedRevenue * units, plan.salesTaxRate),
    processingFee: plan.suggestedProcessingFee * units,
    profit: plan.suggestedProfit * units,
  };
  return {
    recipe,
    sale: recipeSaleDetails(recipe),
    policy,
    plan,
    monthly,
    ladder,
    summary,
    unitContribution,
    variableCostPerUnit,
    breakEvenPrice: priceForMargin({ ...formula, targetMargin: 0 }).listPrice,
    order,
  };
}

export function savePricingPolicy(data, input) {
  const pricingGuide = normalizePricingPolicy({
    ...data.settings,
    pricingGuide: input,
  });
  return {
    ...data,
    settings: {
      ...data.settings,
      pricingGuide,
    },
  };
}

export function applyPricingRecommendation(data, recipeId, input = {}) {
  const recipe = data.recipes.find((row) => row.id === recipeId);
  const plan = usablePlan(data, recipe, {
    ...pricingDeskDefaults(data, recipeId),
    ...input,
  });
  const next = {
    ...recipe,
    salePrice: plan.suggestedSale,
    price: plan.suggestedSale / plan.quantity,
    pricingPlan: {
      ...recipe.pricingPlan,
      targetMargin: plan.targetMargin,
      minimumMargin: plan.minimumMargin,
      wastePercent: plan.wastePercent,
      processorFeePercent: plan.processorFeePercent,
      processorFixedFee: plan.processorFixedFee,
      unitsPerOrder: plan.unitsPerOrder,
      discountPercent: plan.discountPercent,
      roundTo: plan.roundTo,
    },
  };
  const withHistory = saveRecipeRevision(data, recipe, next);
  return {
    ...withHistory,
    recipes: data.recipes.map((row) => (row.id === recipeId ? next : row)),
  };
}
