import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  consumeProductLots,
  createProductLot,
  finishedProductAlerts,
  restoreProductLots,
} from "../src/productLots.js";

test("finished lots capture shelf life and storage instructions", () => {
  const lot = createProductLot(
    { id: "cake", name: "Cake", shelfLifeDays: 3, storageInstructions: "Refrigerate" },
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
    { id: "later", recipeId: "cake", producedAt: "2026-10-27", bestBefore: "2026-11-03", remaining: 5 },
    { id: "first", recipeId: "cake", producedAt: "2026-10-26", bestBefore: "2026-10-29", remaining: 3 },
  ];
  const result = consumeProductLots(lots, "cake", 4);
  assert.deepEqual(result.usage, [
    { productLotId: "first", amount: 3 },
    { productLotId: "later", amount: 1 },
  ]);
  assert.equal(result.lots.find((lot) => lot.id === "later").remaining, 4);
  const restored = restoreProductLots(result.lots, result.usage);
  assert.deepEqual(restored.map((lot) => lot.remaining), [5, 3]);
  assert.equal(finishedProductAlerts({ productLots: lots }, "2026-10-30")[0].expired, true);
});
