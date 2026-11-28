const finite = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};
const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, finite(value, minimum)));

export const normalizeUnitsPerOrder = (value) =>
  Math.round(clamp(value ?? 1, 1, 1000));

export function normalizePricingPolicy(settings = {}) {
  const saved = settings.pricingGuide || {};
  const ownerGoals = settings.ownerGoals || {};
  const targetMargin = clamp(
    saved.targetMargin ?? ownerGoals.targetMargin ?? 35,
    0,
    90,
  );
  return {
    targetMargin,
    minimumMargin: clamp(saved.minimumMargin ?? 20, 0, targetMargin),
    wastePercent: clamp(saved.wastePercent ?? 3, 0, 100),
    processorFeePercent: clamp(saved.processorFeePercent ?? 0, 0, 50),
    processorFixedFee: Math.max(0, finite(saved.processorFixedFee)),
    discountPercent: clamp(saved.discountPercent ?? 0, 0, 90),
    unitsPerOrder: normalizeUnitsPerOrder(saved.unitsPerOrder),
    roundTo: Math.max(0.01, finite(saved.roundTo, 0.5)),
    monthlyFixedCosts: Math.max(
      0,
      finite(
        saved.monthlyFixedCosts ?? settings.finance?.monthlyExpenseBudget ?? 0,
      ),
    ),
    monthlyRevenueGoal: Math.max(
      0,
      finite(saved.monthlyRevenueGoal ?? ownerGoals.monthlyRevenue ?? 0),
    ),
    monthlyProfitGoal: Math.max(
      0,
      finite(saved.monthlyProfitGoal ?? ownerGoals.monthlyProfit ?? 0),
    ),
    workingDays: Math.max(1, Math.round(finite(saved.workingDays, 22))),
  };
}

export function evaluateListPrice(input) {
  const listPrice = Math.max(0, finite(input.listPrice));
  const cost = Math.max(0, finite(input.cost));
  const discountRate = clamp(input.discountPercent, 0, 90) / 100;
  const feeRate = clamp(input.processorFeePercent, 0, 50) / 100;
  const fixedFee = Math.max(0, finite(input.processorFixedFee));
  const realizedRevenue = listPrice * (1 - discountRate);
  const processingFee =
    realizedRevenue > 0 ? realizedRevenue * feeRate + fixedFee : 0;
  const profit = realizedRevenue - processingFee - cost;
  return {
    listPrice,
    realizedRevenue,
    processingFee,
    cost,
    profit,
    margin: realizedRevenue ? (profit / realizedRevenue) * 100 : 0,
    markup: cost ? (profit / cost) * 100 : profit > 0 ? Infinity : 0,
  };
}

export function priceForMargin(input) {
  const cost = Math.max(0, finite(input.cost));
  const targetMargin = Number(input.targetMargin ?? 0);
  if (!Number.isFinite(targetMargin) || targetMargin < 0 || targetMargin >= 100)
    throw Error("Target margin must be between 0% and less than 100%.");
  const feePercent = clamp(input.processorFeePercent, 0, 50);
  const feeRate = feePercent / 100;
  const discountRate = clamp(input.discountPercent, 0, 90) / 100;
  const fixedFee = Math.max(0, finite(input.processorFixedFee));
  const increment = Math.max(1, Math.round(finite(input.roundTo, 0.01) * 100));
  const denominator = 1 - targetMargin / 100 - feeRate;
  if (targetMargin + feePercent >= 100)
    throw Error("Target margin and processing fee must total less than 100%.");
  const realizedRequired = (cost + fixedFee) / denominator;
  const rawListPrice = realizedRequired / Math.max(0.01, 1 - discountRate);
  const listCents =
    Math.ceil((rawListPrice * 100) / increment - 1e-9) * increment;
  if (!Number.isSafeInteger(listCents))
    throw Error("Calculated price is too large. Check costs and margin.");
  const listPrice = listCents / 100;
  return {
    ...evaluateListPrice({
      ...input,
      cost,
      listPrice,
    }),
    rawListPrice,
    targetMargin,
    roundTo: increment / 100,
  };
}

export function monthlySalesPlan(input) {
  const unitRevenue = Math.max(0, finite(input.unitRevenue));
  const unitProfit = finite(input.unitProfit);
  const unitContribution = finite(input.unitContribution, unitProfit);
  const fixedCosts = Math.max(0, finite(input.fixedCosts));
  const revenueGoal = Math.max(0, finite(input.revenueGoal));
  const profitGoal = Math.max(0, finite(input.profitGoal));
  const actualRevenue = Math.max(0, finite(input.actualRevenue));
  const actualProfit = finite(input.actualProfit);
  const workingDays = Math.max(1, Math.round(finite(input.workingDays, 22)));
  const remainingRevenue = Math.max(0, revenueGoal - actualRevenue);
  const remainingProfit = Math.max(0, profitGoal - actualProfit);
  const units = (amount, contribution) =>
    amount <= 0
      ? 0
      : contribution > 0
        ? Math.ceil(amount / contribution)
        : null;
  const breakEvenUnits = units(fixedCosts, unitContribution);
  const revenueGoalUnits = units(revenueGoal, unitRevenue);
  const profitGoalUnits = units(fixedCosts + profitGoal, unitContribution);
  const remainingRevenueUnits = units(remainingRevenue, unitRevenue);
  const remainingProfitUnits = units(remainingProfit, unitProfit);
  return {
    fixedCosts,
    revenueGoal,
    profitGoal,
    actualRevenue,
    actualProfit,
    remainingRevenue,
    remainingProfit,
    breakEvenUnits,
    revenueGoalUnits,
    profitGoalUnits,
    remainingRevenueUnits,
    remainingProfitUnits,
    workingDays,
    breakEvenPerDay:
      breakEvenUnits == null ? null : breakEvenUnits / workingDays,
    revenueGoalPerDay:
      revenueGoalUnits == null ? null : revenueGoalUnits / workingDays,
    profitGoalPerDay:
      profitGoalUnits == null ? null : profitGoalUnits / workingDays,
  };
}
