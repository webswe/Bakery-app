import { test } from "node:test";
import assert from "node:assert/strict";
import {
  archiveCompletedRecords,
  capacityForecast,
  menuProfitability,
  removeRecipe,
  recipeRemovalStatus,
  restoreArchive,
  saveCloseout,
  saveRecipeRevision,
} from "../src/bakeryOperations.js";

const base = () => ({
  items: [
    {
      id: "flour",
      name: "Flour",
      type: "ingredient",
      amount: 1000,
      unit: "g",
      price: 2,
      stock: 10000,
    },
  ],
  recipes: [
    {
      id: "cake",
      name: "Cake",
      category: "Cake",
      yield: 10,
      price: 5,
      saleFormat: "individual",
      saleQuantity: 1,
      salePrice: 5,
      laborMinutes: 60,
      prepMinutes: 30,
      bakeMinutes: 20,
      lines: [{ itemId: "flour", amount: 500, unit: "g" }],
    },
  ],
  settings: {
    hourlyWage: 20,
    electricityRate: 0,
    capacity: { prep: 60, oven: 40, decorating: 60, packing: 60 },
  },
  sales: [{ id: "sale", recipeId: "cake", quantity: 10, net: 50 }],
  productionPlans: [
    {
      id: "plan",
      recipeId: "cake",
      date: "2026-11-05",
      batches: 2,
      status: "planned",
    },
  ],
  orders: [],
  recipeVersions: [],
  closeouts: [],
  archives: [],
});

test("recipe revisions preserve the previous recipe", () => {
  const data = base();
  const next = { ...data.recipes[0], yield: 12 };
  const result = saveRecipeRevision(data, data.recipes[0], next);
  assert.equal(result.recipeVersions.length, 1);
  assert.equal(result.recipeVersions[0].recipe.yield, 10);
});

test("recipes can be removed only after active work is cleared", () => {
  const data = base();
  const status = recipeRemovalStatus(data, "cake");
  assert.match(status.blockers.join(" "), /planned production task/);
  assert.throws(() => removeRecipe(data, "cake"), /Resolve/);

  const removable = {
    ...data,
    productionPlans: [],
    quotes: [],
    products: { cake: { quantity: 0, value: 0 } },
  };
  const result = removeRecipe(removable, "cake");
  assert.equal(result.recipes.length, 0);
  assert.equal(result.products.cake, undefined);
});

test("capacity forecast highlights overloaded stations", () => {
  const row = capacityForecast(base(), "2026-11-05", 1)[0];
  assert.equal(row.load.prep, 60);
  assert.equal(row.load.oven, 40);
  assert.equal(row.peak, 100);
});

test("profitability uses recorded recipe sales and current cost", () => {
  const row = menuProfitability(base())[0];
  assert.equal(row.revenue, 50);
  assert.ok(row.profit > 0);
  assert.ok(row.profitPerLaborHour > 0);
});

test("closeout replaces the same day and archive is reversible", () => {
  let data = saveCloseout(base(), {
    date: "2026-11-05",
    checks: ["Payments reviewed"],
  });
  data = saveCloseout(data, { date: "2026-11-05", checks: ["Stock counted"] });
  assert.deepEqual(data.closeouts[0].checks, ["Stock counted"]);
  data = {
    ...data,
    orders: [{ id: "old", status: "completed", pickupDate: "2025-01-01" }],
    productionPlans: [
      { id: "old-plan", status: "completed", date: "2025-01-01" },
    ],
  };
  const archived = archiveCompletedRecords(data, "2026-01-01");
  assert.equal(archived.orders.length, 0);
  const restored = restoreArchive(archived, archived.archives[0].id);
  assert.equal(restored.orders[0].id, "old");
});
