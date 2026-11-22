import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateListPrice,
  monthlySalesPlan,
  normalizePricingPolicy,
  priceForMargin,
} from "../src/pricingStrategy.js";

test("fee-aware pricing solves the target margin after discount and rounds the full unit", () => {
  const result = priceForMargin({
    cost: 10,
    targetMargin: 40,
    processorFeePercent: 3,
    processorFixedFee: 0.5,
    discountPercent: 10,
    roundTo: 0.5,
  });
  assert.equal(result.listPrice, 20.5);
  assert.ok(result.margin >= 40);
  assert.equal(
    evaluateListPrice({
      listPrice: result.listPrice,
      cost: 10,
      processorFeePercent: 3,
      processorFixedFee: 0.5,
      discountPercent: 10,
    }).profit,
    result.profit,
  );
});

test("impossible combined margins and fees are rejected", () => {
  assert.throws(
    () =>
      priceForMargin({
        cost: 10,
        targetMargin: 80,
        processorFeePercent: 20,
      }),
    /less than 100/i,
  );
});

test("pricing policy inherits owner goals and preserves explicit assumptions", () => {
  const policy = normalizePricingPolicy({
    ownerGoals: { targetMargin: 42, monthlyRevenue: 5000 },
    pricingGuide: {
      wastePercent: 5,
      processorFeePercent: 2.9,
      monthlyFixedCosts: 1200,
    },
  });
  assert.equal(policy.targetMargin, 42);
  assert.equal(policy.monthlyRevenueGoal, 5000);
  assert.equal(policy.wastePercent, 5);
  assert.equal(policy.processorFeePercent, 2.9);
  assert.equal(policy.monthlyFixedCosts, 1200);
});

test("monthly sales plans expose break-even and goal pace", () => {
  const plan = monthlySalesPlan({
    unitRevenue: 20,
    unitProfit: 8,
    unitContribution: 12,
    fixedCosts: 1200,
    revenueGoal: 5000,
    profitGoal: 1000,
    actualRevenue: 1000,
    actualProfit: 200,
    workingDays: 20,
  });
  assert.equal(plan.breakEvenUnits, 100);
  assert.equal(plan.revenueGoalUnits, 250);
  assert.equal(plan.profitGoalUnits, 184);
  assert.equal(plan.remainingRevenueUnits, 200);
  assert.equal(plan.remainingProfitUnits, 100);
  assert.equal(plan.breakEvenPerDay, 5);
});
