import { test } from "node:test";
import assert from "node:assert/strict";
import { backupSummary, exportCsv, importCsv, productionTimeline, saveOrderRequest, salesTrend, tasksForDate } from "../src/ownerToolkit.js";
import { recipePricingPlan } from "../src/recipePricing.js";

const data = () => ({
  items: [{ id: "flour", name: "Flour", type: "ingredient", amount: 1000, unit: "g", price: 2, stock: 5000 }],
  recipes: [{ id: "cake", name: "Cake", category: "Cake", yield: 10, price: 3, saleFormat: "box", saleQuantity: 2, salePrice: 6, prepMinutes: 20, bakeMinutes: 30, coolingMinutes: 40, laborMinutes: 50, lines: [{ itemId: "flour", amount: 500, unit: "g" }] }],
  settings: { hourlyWage: 18, electricityRate: 0 },
  productionPlans: [{ id: "plan", recipeId: "cake", recipeName: "Cake", date: "2026-11-06", batches: 2, status: "planned" }],
  recurringTasks: [{ id: "feed", title: "Feed starter", weekdays: [5], time: "06:00", active: true }],
  sales: [{ id: "sale", date: "2026-11-01", recipeId: "cake", quantity: 2, net: 6, cost: 2 }],
  customers: [], orders: [], expenses: [], orderRequests: [],
});

test("pricing plan recommends a rounded selling-unit price from full cost", () => {
  const source = data();
  const plan = recipePricingPlan(source.recipes[0], source.items, source.settings, { targetMargin: 40, minimumMargin: 25, roundTo: 0.5 });
  assert.equal(plan.quantity, 2);
  assert.equal((plan.suggestedSale * 2) % 1, 0);
  assert.ok(plan.suggestedSale > 0);
});

test("timeline expands recipe phases and recurring tasks match the day", () => {
  const source = data();
  const timeline = productionTimeline(source, "2026-11-06", "06:00");
  assert.deepEqual(timeline.map((row) => row.phase), ["Prep", "Bake", "Cool", "Decorate & pack"]);
  assert.equal(timeline[0].start, 360);
  assert.equal(tasksForDate(source, "2026-11-06")[0].title, "Feed starter");
});

test("order intake, CSV round-trip, trends and backup preview preserve records", () => {
  let source = data();
  source = saveOrderRequest(source, { customer: "Ana", pickupDate: "2026-11-10", servings: 12 });
  assert.equal(source.orderRequests[0].customer, "Ana");
  const csv = exportCsv(source, "ingredients");
  const imported = importCsv({ ...source, items: [] }, "ingredients", csv);
  assert.equal(imported.items[0].name, "Flour");
  assert.equal(salesTrend(source).at(-1).revenue, 6);
  assert.equal(backupSummary(JSON.stringify(source)).counts.recipes, 1);
});
