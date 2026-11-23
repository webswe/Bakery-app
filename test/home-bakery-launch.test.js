import assert from "node:assert/strict";
import test from "node:test";
import {
  beginnerJourney,
  launchMenuGuide,
  launchReadiness,
  normalizeLaunchProfile,
  policyText,
  saveLaunchProfile,
  startupBudget,
  toggleLaunchStep,
  weeklyLaunchPlan,
} from "../src/homeBakeryLaunch.js";

const fixture = () => ({
  businessProfile: { bakeryName: "Sunrise Home Bakery" },
  items: [
    {
      id: "flour",
      name: "Flour",
      amount: 1000,
      unit: "g",
      price: 4,
      stock: 2000,
      type: "ingredient",
      taxMode: "exempt",
    },
  ],
  recipes: [
    {
      id: "cookies",
      name: "Cookie box",
      yield: 8,
      price: 3,
      saleFormat: "box",
      saleQuantity: 4,
      salePrice: 12,
      laborMinutes: 60,
      lines: [{ itemId: "flour", amount: 500, unit: "g" }],
    },
  ],
  sales: [],
  payments: [],
  settings: {
    hourlyWage: 15,
    electricityRate: 0.2,
    homeBakeryLaunch: {
      monthlyOwnerIncome: 1000,
      workingDaysPerWeek: 3,
      maxBatchesPerWeek: 8,
      startupCash: 500,
      startupCosts: {
        permits: 100,
        insurance: 100,
        equipment: 500,
        packaging: 100,
        branding: 50,
        marketFees: 50,
        other: 100,
      },
      monthlyCosts: {
        insurance: 25,
        utilities: 25,
        software: 0,
        marketing: 25,
        marketFees: 25,
        other: 0,
      },
    },
  },
});

test("launch profiles normalize nested costs, capacity and policy defaults", () => {
  const profile = normalizeLaunchProfile({
    homeBakeryLaunch: {
      workingDaysPerWeek: 9,
      maxBatchesPerWeek: 0,
      policies: { depositPercent: 150, leadDays: 5 },
    },
  });
  assert.equal(profile.workingDaysPerWeek, 7);
  assert.equal(profile.maxBatchesPerWeek, 1);
  assert.equal(profile.policies.depositPercent, 100);
  assert.equal(profile.policies.leadDays, 5);
  assert.equal(profile.channels.customOrders, true);
});

test("startup budget exposes remaining cash and a three-month runway", () => {
  const result = startupBudget(fixture().settings);
  assert.equal(result.startupTotal, 1000);
  assert.equal(result.monthlyTotal, 100);
  assert.equal(result.remainingStartup, 500);
  assert.equal(result.threeMonthRunway, 1300);
});

test("readiness combines saved checklist decisions and app evidence", () => {
  let data = fixture();
  data = toggleLaunchStep(data, "rules");
  const result = launchReadiness(data);
  assert.equal(result.steps.find((row) => row.id === "rules").complete, true);
  assert.equal(
    result.steps.find((row) => row.id === "identity").automatic,
    true,
  );
  assert.equal(result.steps.find((row) => row.id === "menu").complete, true);
  assert.ok(result.percent > 0);
});

test("launch menu and weekly plan connect profit goals to owner capacity", () => {
  const data = fixture();
  const [recipe] = launchMenuGuide(data);
  assert.equal(recipe.name, "Cookie box");
  assert.ok(recipe.profit > 0);
  assert.ok(recipe.margin > 20);
  assert.deepEqual(recipe.readiness, []);

  const plan = weeklyLaunchPlan(data);
  assert.equal(plan.menu.length, 1);
  assert.ok(plan.weeklyNeed > 0);
  assert.ok(plan.unitsPerWeek > 0);
  assert.ok(plan.requiredBatches > 0);
  assert.ok(plan.capacityUnits > 0);
});

test("saved launch settings preserve unrelated app settings", () => {
  const data = fixture();
  const next = saveLaunchProfile(data, {
    stage: "soft-launch",
    channels: { markets: true },
    policies: { depositPercent: 40 },
  });
  assert.equal(next.settings.hourlyWage, 15);
  assert.equal(next.settings.homeBakeryLaunch.stage, "soft-launch");
  assert.equal(next.settings.homeBakeryLaunch.channels.markets, true);
  assert.equal(next.settings.homeBakeryLaunch.channels.customOrders, true);
  assert.equal(next.settings.homeBakeryLaunch.policies.depositPercent, 40);
});

test("policy text includes business terms and a local-requirements warning", () => {
  const text = policyText(
    {
      homeBakeryLaunch: {
        policies: {
          depositPercent: 50,
          leadDays: 7,
          cancellationHours: 48,
          pickupWindow: "Pickup Saturday.",
          latePolicy: "Call if late.",
        },
      },
    },
    "Sunrise Home Bakery",
  );
  assert.match(text, /Sunrise Home Bakery/);
  assert.match(text, /50% deposit/);
  assert.match(text, /7 day/);
  assert.match(text, /home kitchen/i);
  assert.match(text, /requirements/i);
});

test("beginner journey starts with one product and tracks the first 10 sales", () => {
  const data = fixture();
  const journey = beginnerJourney(data);
  assert.equal(journey.recipe.name, "Cookie box");
  assert.equal(
    journey.steps.find((row) => row.id === "first-product").complete,
    true,
  );
  assert.equal(
    journey.steps.find((row) => row.id === "first-quote").complete,
    false,
  );
  assert.equal(journey.weeklyUnits, 9);
  assert.ok(journey.weeklyProfit > 0);
  assert.equal(journey.salesCount, 0);

  data.sales = Array.from({ length: 10 }, (_, index) => ({
    id: String(index),
  }));
  const experienced = beginnerJourney(data);
  assert.equal(
    experienced.steps.find((row) => row.id === "first-ten").complete,
    true,
  );
});
