import { monthlySummary } from "./analytics.js";
import { recipePricingPlan, recipeSaleDetails } from "./recipePricing.js";
import {
  monthlySalesPlan,
  normalizePricingPolicy,
  priceForMargin,
} from "./pricingStrategy.js";

export function pricingDeskReport(data, recipeId, input = {}, month = "") {
  const recipe = data.recipes.find((row) => row.id === recipeId);
  if (!recipe) throw Error("Choose a recipe.");
  const policy = {
    ...normalizePricingPolicy(data.settings),
    ...input,
  };
  const plan = recipePricingPlan(recipe, data.items, data.settings, {
    ...policy,
    salesTaxRate: input.salesTaxRate ?? data.salesTaxRate ?? 0,
  });
  const summary = monthlySummary(
    data,
    month || new Date().toISOString().slice(0, 7),
  );
  const variableCostPerUnit =
    (plan.variableTotal * (1 + plan.wastePercent / 100)) / plan.sellableUnits;
  const unitContribution =
    plan.suggestedSale * (1 - plan.discountPercent / 100) -
    plan.suggestedSale *
      (1 - plan.discountPercent / 100) *
      (plan.processorFeePercent / 100) -
    plan.processorFixedFee -
    variableCostPerUnit;
  const monthly = monthlySalesPlan({
    unitRevenue: plan.suggestedSale * (1 - plan.discountPercent / 100),
    unitProfit: plan.suggestedProfit,
    unitContribution,
    fixedCosts: policy.monthlyFixedCosts,
    revenueGoal: policy.monthlyRevenueGoal,
    profitGoal: policy.monthlyProfitGoal,
    actualRevenue: summary.revenue,
    actualProfit: summary.profit,
    workingDays: policy.workingDays,
  });
  const ladderMargins = [...new Set([20, 30, 35, 40, 50, plan.targetMargin])]
    .filter((value) => value <= 90)
    .sort((a, b) => a - b);
  const ladder = ladderMargins.map((targetMargin) => ({
    targetMargin,
    ...priceForMargin({
      cost: plan.costPerSellingUnit,
      targetMargin,
      processorFeePercent: plan.processorFeePercent,
      processorFixedFee: plan.processorFixedFee,
      discountPercent: plan.discountPercent,
      roundTo: plan.roundTo,
    }),
  }));
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
  if (!recipe) throw Error("Choose a recipe.");
  const plan = recipePricingPlan(recipe, data.items, data.settings, {
    ...input,
    salesTaxRate: input.salesTaxRate ?? data.salesTaxRate ?? 0,
  });
  return {
    ...data,
    recipes: data.recipes.map((row) =>
      row.id === recipeId
        ? {
            ...row,
            salePrice: plan.suggestedSale,
            price: plan.suggestedSale / plan.quantity,
            pricingPlan: {
              ...row.pricingPlan,
              targetMargin: plan.targetMargin,
              minimumMargin: plan.minimumMargin,
              wastePercent: plan.wastePercent,
              processorFeePercent: plan.processorFeePercent,
              processorFixedFee: plan.processorFixedFee,
              discountPercent: plan.discountPercent,
              roundTo: plan.roundTo,
            },
          }
        : row,
    ),
  };
}
