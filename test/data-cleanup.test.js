import { test } from "node:test";
import assert from "node:assert/strict";
import { clearSelectedData } from "../src/dataCleanup.js";

const fixture = () => ({
  items: [{ id: "flour" }],
  inventoryLots: [{ id: "lot" }],
  purchaseHistory: [{ id: "purchase" }],
  movements: [{ id: "movement" }],
  recipes: [{ id: "recipe" }],
  products: { recipe: { quantity: 4 } },
  sales: [{ id: "sale" }],
  orders: [{ id: "order" }],
  customers: [{ id: "customer" }],
  expenses: [{ id: "expense" }],
  settings: {
    hourlyWage: 20,
    electricityRate: 0.2,
    appearance: { themeId: "plum" },
  },
  businessProfile: { name: "Test bakery" },
  taxRates: { food: 2, other: 7 },
  tax: 7,
  salesTaxRate: 8,
});

test("data cleanup clears only selected groups", () => {
  const next = clearSelectedData(fixture(), ["inventory"]);
  assert.deepEqual(next.items, []);
  assert.deepEqual(next.inventoryLots, []);
  assert.deepEqual(next.purchaseHistory, []);
  assert.deepEqual(next.movements, []);
  assert.equal(next.recipes.length, 1);
  assert.equal(next.sales.length, 1);
  assert.equal(next.businessProfile.name, "Test bakery");
});

test("profile cleanup restores safe defaults without affecting records", () => {
  const next = clearSelectedData(fixture(), ["preferences"]);
  assert.deepEqual(next.settings, { hourlyWage: 0, electricityRate: 0 });
  assert.deepEqual(next.businessProfile, {
    supportEmail: "botaa109@gmail.com",
  });
  assert.deepEqual(next.taxRates, { food: 0, other: 0 });
  assert.equal(next.salesTaxRate, 0);
  assert.equal(next.items.length, 1);
  assert.equal(next.sales.length, 1);
});
