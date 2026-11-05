import { test } from "node:test";
import assert from "node:assert/strict";
import { recipeCostDetails, recipeSaleDetails } from "../src/recipePricing.js";

test("box pricing keeps a compatible per-dessert price and separates packaging cost", () => {
  const items = [
    { id: "flour", type: "ingredient", amount: 1000, unit: "g", price: 4, taxMode: "exempt", tax: 0 },
    { id: "box", type: "packaging", amount: 10, unit: "each", price: 5, taxMode: "exempt", tax: 0 },
  ];
  const recipe = { yield: 6, price: 3, saleFormat: "box", saleQuantity: 6, salePrice: 18, laborMinutes: 30, electricityKwh: 1, overheadPerBatch: 2, lines: [{ itemId: "flour", amount: 300, unit: "g" }, { itemId: "box", amount: 1, unit: "each" }] };
  assert.deepEqual(recipeSaleDetails(recipe), { format: "box", quantity: 6, unitPrice: 3, salePrice: 18, label: "box" });
  const details = recipeCostDetails(recipe, items, { hourlyWage: 20, electricityRate: 1 });
  assert.equal(details.ingredients, 1.2);
  assert.equal(details.packaging, 0.5);
  assert.equal(details.total, 14.7);
  assert.equal(details.revenue, 18);
});
