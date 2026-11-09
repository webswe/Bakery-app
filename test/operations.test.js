import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addPresets,
  availability,
  produce,
  sell,
  sellMany,
  fullCost,
} from "../src/operations.js";
import { lineCost } from "../src/costing.js";
function fixture() {
  return {
    items: [
      {
        id: "flour",
        name: "Flour",
        stock: 1,
        unit: "kg",
        amount: 2,
        price: 5,
        taxIncluded: true,
        gramsPerCup: 120,
      },
    ],
    recipes: [
      {
        id: "cake",
        name: "Cake",
        yield: 4,
        price: 5,
        lines: [{ itemId: "flour", amount: 2, unit: "cup" }],
        laborMinutes: 30,
        electricityKwh: 2,
        overheadPerBatch: 1,
      },
    ],
    settings: { hourlyWage: 12, electricityRate: 0.2 },
    products: {},
    sales: [],
    movements: [],
  };
}
test("availability aggregates repeated ingredients", () => {
  const d = fixture();
  d.recipes[0].lines.push({ ...d.recipes[0].lines[0] });
  assert.equal(availability(d.recipes[0], d.items).batches, 2);
});
test("production consumes stock and captures labor and electricity", () => {
  const d = fixture(),
    n = produce(d, "cake", 2);
  assert.ok(Math.abs(n.items[0].stock - 0.52) < 1e-10);
  assert.equal(n.products.cake.quantity, 8);
  assert.ok(Math.abs(n.products.cake.value - 16) < 1e-10);
  assert.equal(d.items[0].stock, 1);
  assert.throws(() => produce(d, "cake", 5), /Insufficient/);
});
test("production creates a traceable finished lot and sales consume it", () => {
  const data = fixture();
  data.recipes[0].shelfLifeDays = 4;
  data.recipes[0].storageInstructions = "Keep refrigerated";
  const made = produce(data, "cake", 1, undefined, undefined, undefined, {
    productionDate: "2026-10-27",
    productionPlanId: "plan",
  });
  assert.equal(made.productLots[0].bestBefore, "2026-10-31");
  assert.equal(made.productionBatches[0].productionPlanId, "plan");
  assert.equal(made.productionBatches[0].productLotId, made.productLots[0].id);
  const sold = sell(made, {
    recipe: "cake",
    quantity: 2,
    total: 10,
    date: "2026-10-28",
    orderType: "Wholesale",
  });
  assert.equal(sold.productLots[0].remaining, 2);
  assert.equal(sold.sales.at(-1).productLotUsage[0].amount, 2);
  assert.equal(sold.sales.at(-1).orderType, "Wholesale");
});
test("sales consume weighted finished cost and prevent overselling", () => {
  const d = produce(fixture(), "cake", 1);
  const n = sell(d, {
    recipe: "cake",
    quantity: 2,
    total: 10,
    date: "2026-10-27",
  });
  assert.equal(n.products.cake.quantity, 2);
  assert.ok(Math.abs(n.sales[0].cost - 4) < 1e-10);
  assert.throws(
    () => sell(n, { recipe: "cake", quantity: 3, total: 15 }),
    /Not enough/,
  );
});
test("one checkout can record several desserts with a shared sale type", () => {
  let data = produce(fixture(), "cake", 1);
  data = {
    ...data,
    recipes: [
      ...data.recipes,
      { ...data.recipes[0], id: "cookie", name: "Cookie", price: 3 },
    ],
    products: { ...data.products, cookie: { quantity: 3, value: 6 } },
    productLots: [
      ...data.productLots,
      {
        id: "cookie-lot",
        recipeId: "cookie",
        recipeName: "Cookie",
        quantity: 3,
        remaining: 3,
        cost: 6,
      },
    ],
  };
  const result = sellMany(data, {
    date: "2026-10-27",
    taxRate: 0,
    orderType: "Market / pop-up",
    lines: [
      { recipeId: "cake", quantity: 2, discount: 0 },
      { recipeId: "cookie", quantity: 1, discount: 0 },
    ],
  });
  assert.equal(result.sales.length, 2);
  assert.equal(result.products.cake.quantity, 2);
  assert.equal(result.products.cookie.quantity, 2);
  assert.ok(result.sales.every((sale) => sale.orderType === "Market / pop-up"));
  assert.equal(result.sales[0].saleBatchId, result.sales[1].saleBatchId);
});
test("unpaid direct sales retain stock movement and a due status", () => {
  const data = produce(fixture(), "cake", 1);
  const result = sell(data, {
    recipe: "cake",
    quantity: 1,
    total: 5,
    paymentStatus: "unpaid",
  });
  assert.equal(result.products.cake.quantity, 3);
  assert.equal(result.sales[0].paymentStatus, "unpaid");
  assert.equal(result.sales[0].payment, "Unpaid");
});
test("presets add no duplicates and never invent purchase prices", () => {
  let d = addPresets(fixture());
  assert.ok(d.items.length > 20);
  assert.equal(addPresets(d).items.length, d.items.length);
  assert.ok(
    d.items
      .filter((i) => i.needsPrice)
      .every((i) => i.price === 0 && i.stock === 0),
  );
});
test("piece weight handles eggs bought by dozen and recipes in grams", () => {
  assert.equal(
    lineCost({ itemId: "eggs", amount: 100, unit: "g" }, [
      {
        id: "eggs",
        amount: 12,
        unit: "each",
        price: 6,
        taxIncluded: true,
        gramsPerEach: 50,
      },
    ]).cost,
    1,
  );
});
