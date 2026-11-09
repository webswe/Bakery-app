import assert from "node:assert/strict";
import test from "node:test";
import {
  applyScheduleSuggestions,
  financialCenter,
  productionPerformance,
  scheduleSuggestions,
  supplierInsights,
  wasteCoaching,
} from "../src/businessIntelligence.js";

const base = () => ({
  items: [
    {
      id: "flour",
      name: "Flour",
      amount: 1000,
      unit: "g",
      price: 4,
      stock: 500,
      minStock: 600,
      tax: 0,
    },
  ],
  recipes: [
    {
      id: "cake",
      name: "Cake",
      yield: 8,
      lines: [{ itemId: "flour", amount: 200, unit: "g" }],
      prepMinutes: 30,
      bakeMinutes: 40,
      coolMinutes: 60,
      decorateMinutes: 45,
    },
  ],
  settings: {
    ownerGoals: {
      monthlyRevenue: 1000,
      monthlyProfit: 400,
      targetMargin: 40,
      maxWastePercent: 2,
    },
  },
  orders: [],
  productionPlans: [],
  productionBatches: [],
  sales: [],
  expenses: [],
  payments: [],
  waste: [],
  purchaseHistory: [],
});

test("financial center keeps tax outside revenue and reports goal progress", () => {
  const data = base();
  data.sales.push({
    id: "sale",
    date: "2026-11-01",
    net: 500,
    total: 535,
    tax: 35,
    cost: 200,
    quantity: 10,
  });
  data.expenses.push({ date: "2026-11-02", amount: 50, category: "Fuel" });
  data.waste.push({ date: "2026-11-03", cost: 12, name: "Cake" });
  const report = financialCenter(data, "2026-11");
  assert.equal(report.revenue, 500);
  assert.equal(report.collectedTax, 35);
  assert.equal(report.profit, 250);
  assert.equal(report.progress.revenue, 50);
  assert.equal(report.wastePercent, 2.4);
});

test("financial center includes earlier deposits when calculating order balances", () => {
  const data = base();
  data.orders.push({
    id: "order",
    pickupDate: "2026-11-20",
    status: "open",
    total: 300,
  });
  data.payments.push({
    id: "deposit",
    orderId: "order",
    date: "2026-10-20",
    kind: "payment",
    amount: 100,
  });
  assert.equal(financialCenter(data, "2026-11").outstanding, 200);
});

test("unpaid direct sales are due but do not count as cash received", () => {
  const data = base();
  data.sales.push(
    {
      id: "paid",
      date: "2026-11-01",
      total: 20,
      net: 20,
      cost: 8,
      quantity: 2,
    },
    {
      id: "due",
      date: "2026-11-02",
      total: 30,
      net: 30,
      cost: 12,
      quantity: 3,
      paymentStatus: "unpaid",
    },
  );
  const report = financialCenter(data, "2026-11");
  assert.equal(report.cashIn, 20);
  assert.equal(report.outstanding, 30);
});

test("scheduler creates one linked plan for an unplanned accepted order", () => {
  const data = base();
  data.orders.push({
    id: "order-1",
    customer: "Ari",
    recipeId: "cake",
    recipeName: "Cake",
    portions: 16,
    pickupDate: "2026-11-10",
    status: "open",
  });
  const suggestions = scheduleSuggestions(data, "2026-11-01");
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].batches, 2);
  const next = applyScheduleSuggestions(data, suggestions);
  assert.equal(next.productionPlans.length, 1);
  assert.equal(next.productionPlans[0].orderId, "order-1");
  assert.equal(next.productionPlans[0].date, "2026-11-09");
});

test("production performance compares recorded yield with the plan", () => {
  const data = base();
  data.productionPlans.push({
    id: "plan",
    recipeId: "cake",
    batches: 2,
    date: "2026-11-03",
    status: "completed",
    completedAt: "2026-11-03T15:00:00.000Z",
  });
  data.productionBatches.push({
    id: "batch",
    productionPlanId: "plan",
    actualYield: 15,
  });
  const report = productionPerformance(data);
  assert.equal(report.measured, 1);
  assert.equal(report.rows[0].plannedYield, 16);
  assert.equal(report.rows[0].yieldVariance, -6.25);
});

test("supplier and waste insights choose actionable comparisons", () => {
  const data = base();
  data.purchaseHistory.push(
    {
      itemId: "flour",
      itemName: "Flour",
      supplier: "Market A",
      amount: 1000,
      finalPackageCost: 5,
      date: "2026-11-01",
    },
    {
      itemId: "flour",
      itemName: "Flour",
      supplier: "Market B",
      amount: 2000,
      finalPackageCost: 8,
      date: "2026-11-02",
    },
  );
  data.waste.push({
    date: "2026-11-02",
    itemId: "flour",
    reason: "Expired",
    cost: 3,
  });
  const suppliers = supplierInsights(data);
  assert.equal(suppliers[0].best.supplier, "Market B");
  assert.equal(suppliers[0].reorder, true);
  assert.match(wasteCoaching(data, "2026-11")[0].action, /smaller packages/i);
});
