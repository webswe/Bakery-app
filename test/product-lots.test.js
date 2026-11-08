import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  adjustFinishedStock,
  consumeProductLots,
  createProductLot,
  discardProductLot,
  finishedProductAlerts,
  restoreProductLots,
} from "../src/productLots.js";

test("finished lots capture shelf life and storage instructions", () => {
  const lot = createProductLot(
    {
      id: "cake",
      name: "Cake",
      shelfLifeDays: 3,
      storageInstructions: "Refrigerate",
    },
    8,
    20,
    "batch",
    "2026-10-27",
  );
  assert.equal(addDays("2026-10-27", 3), "2026-10-30");
  assert.equal(lot.bestBefore, "2026-10-30");
  assert.equal(lot.storageInstructions, "Refrigerate");
});

test("finished stock is consumed by earliest best-before date", () => {
  const lots = [
    {
      id: "later",
      recipeId: "cake",
      producedAt: "2026-10-27",
      bestBefore: "2026-11-03",
      remaining: 5,
    },
    {
      id: "first",
      recipeId: "cake",
      producedAt: "2026-10-26",
      bestBefore: "2026-10-29",
      remaining: 3,
    },
  ];
  const result = consumeProductLots(lots, "cake", 4);
  assert.deepEqual(result.usage, [
    { productLotId: "first", amount: 3 },
    { productLotId: "later", amount: 1 },
  ]);
  assert.equal(result.lots.find((lot) => lot.id === "later").remaining, 4);
  const restored = restoreProductLots(result.lots, result.usage);
  assert.deepEqual(
    restored.map((lot) => lot.remaining),
    [5, 3],
  );
  assert.equal(
    finishedProductAlerts({ productLots: lots }, "2026-10-30")[0].expired,
    true,
  );
});

test("finished stock adjustments add and remove traceable portions", () => {
  const data = {
    recipes: [
      { id: "cake", name: "Cake", shelfLifeDays: 3, yield: 8, lines: [] },
    ],
    products: {},
    productLots: [],
    movements: [],
  };
  const added = adjustFinishedStock(data, "cake", {
    direction: "add",
    quantity: 6,
    unitCost: 2,
    date: "2026-11-07",
    reason: "Opening count",
  });
  assert.deepEqual(added.products.cake, { quantity: 6, value: 12 });
  assert.equal(added.productLots[0].remaining, 6);
  assert.equal(added.productLots[0].bestBefore, "2026-11-10");
  assert.equal(added.movements[0].delta, 6);

  const removed = adjustFinishedStock(added, "cake", {
    direction: "remove",
    quantity: 2,
    date: "2026-11-08",
    reason: "Damaged",
  });
  assert.deepEqual(removed.products.cake, { quantity: 4, value: 8 });
  assert.equal(removed.productLots[0].remaining, 4);
  assert.equal(removed.movements.at(-1).delta, -2);
  assert.throws(
    () =>
      adjustFinishedStock(removed, "cake", {
        direction: "remove",
        quantity: 5,
        reason: "Count correction",
      }),
    /Only 4 portions/,
  );
});

test("a whole baked lot can be discarded while retaining its trace record", () => {
  const data = {
    recipes: [{ id: "cake", name: "Cake", yield: 8, lines: [] }],
    products: { cake: { quantity: 8, value: 20 } },
    productLots: [
      {
        id: "lot-1",
        recipeId: "cake",
        recipeName: "Cake",
        quantity: 8,
        remaining: 8,
        cost: 20,
      },
    ],
    movements: [],
  };
  const result = discardProductLot(data, "lot-1");
  assert.deepEqual(result.products.cake, { quantity: 0, value: 0 });
  assert.equal(result.productLots[0].remaining, 0);
  assert.equal(result.movements[0].kind, "Finished lot discarded");
  assert.equal(result.movements[0].delta, -8);
});
