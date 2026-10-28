import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dailySnapshot,
  expiryRecipeSuggestions,
  packingSteps,
  priceChanges,
  recordActualYield,
  savePurchaseOrder,
  saveSeasonalPlan,
  togglePackingStep,
} from "../src/ownerFeatures.js";

test("daily snapshot separates earned revenue, cash, tax and costs", () => {
  const result = dailySnapshot({
    sales: [{ date: "2026-10-28", net: 100, tax: 7, total: 107, cost: 40, quantity: 8 }],
    expenses: [{ date: "2026-10-28", amount: 10 }],
    payments: [{ date: "2026-10-28", amount: 30, kind: "payment" }],
    productionBatches: [{ producedAt: "2026-10-28", batches: 2 }],
  }, "2026-10-28");
  assert.equal(result.revenue, 100);
  assert.equal(result.tax, 7);
  assert.equal(result.cashReceived, 30);
  assert.equal(result.profit, 50);
});

test("price and expiry insights use recorded supplier and lot history", () => {
  const data = {
    purchaseHistory: [
      { itemId: "cream", itemName: "Cream", supplier: "Dairy", date: "2026-10-01", finalPackageCost: 4 },
      { itemId: "cream", itemName: "Cream", supplier: "Dairy", date: "2026-10-20", finalPackageCost: 5 },
    ],
    inventoryLots: [{ id: "lot", itemId: "cream", remaining: 2, expiryDate: "2026-11-02" }],
    items: [{ id: "cream", name: "Cream" }],
    recipes: [{ id: "cake", name: "Cake", lines: [{ itemId: "cream" }] }],
  };
  assert.equal(priceChanges(data)[0].percent, 25);
  assert.equal(expiryRecipeSuggestions(data, "2026-10-28").recipes[0].recipe.name, "Cake");
});

test("packing, actual yield and seasonal targets remain on their source records", () => {
  let data = {
    orders: [{ id: "order", status: "open" }],
    productionBatches: [{ id: "batch", quantity: 12 }],
    recipes: [{ id: "cake", name: "Cake", yield: 6, lines: [] }],
    seasonalPlans: [],
  };
  data = togglePackingStep(data, "order", packingSteps[0]);
  assert.deepEqual(data.orders[0].packingChecklist, [packingSteps[0]]);
  data = recordActualYield(data, "batch", 11, "one damaged");
  assert.equal(data.productionBatches[0].actualYield, 11);
  data = saveSeasonalPlan(data, {
    title: "Holiday market",
    startDate: "2026-12-01",
    endDate: "2026-12-02",
    recipeId: "cake",
    targetPortions: 25,
  });
  assert.equal(data.seasonalPlans[0].batches, 5);
  data = savePurchaseOrder(data, "2026-12-01", [{ supplier: "Dairy", estimate: 12 }]);
  assert.equal(data.purchaseOrders[0].estimatedTotal, 12);
});
