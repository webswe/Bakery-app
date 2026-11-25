import assert from "node:assert/strict";
import test from "node:test";
import { updateOrder } from "../src/business.js";
import {
  applyMenuPrice,
  assignPickupSlot,
  checkOrderFit,
  pickupConfirmation,
  previewMenuPrice,
  promoteTestBatch,
  recordTestBatch,
  savePickupSlot,
} from "../src/homeBakeryTools.js";
import { quoteCalculation } from "../src/planning.js";

const day = "2026-12-04";
function workspace() {
  return {
    items: [{ id: "flour", name: "Flour", amount: 1000, unit: "g", price: 10, stock: 2000 }],
    recipes: [{
      id: "cookies",
      name: "Cookies",
      yield: 12,
      price: 2,
      prepMinutes: 10,
      bakeMinutes: 20,
      storageInstructions: "Keep sealed.",
      lines: [{ itemId: "flour", amount: 200, unit: "g" }],
    }],
    settings: { capacity: { oven: 30 } },
    productionPlans: [],
    orders: [],
    quotes: [],
  };
}

test("order fit accounts for existing oven load and shared ingredients", () => {
  const data = workspace();
  data.productionPlans.push({ id: "existing", recipeId: "cookies", date: day, batches: 1, status: "planned" });
  const input = { pickup: day, recipeId: "cookies", portions: 12 };
  const result = checkOrderFit(data, input, day);
  assert.equal(result.fits, false);
  assert.deepEqual(result.overloaded, ["oven"]);
  assert.equal(result.earliest, "2026-12-05");
  assert.equal(data.productionPlans.length, 1);

  data.items[0].stock = 250;
  const short = checkOrderFit(data, input, day);
  assert.equal(short.shortages[0].shortage, 150);
  assert.equal(short.earliest, "");
});

test("trial promotion keeps the main recipe identity and captures a revision", () => {
  const data = workspace();
  const saved = recordTestBatch(data, {
    recipeId: "cookies", label: "Trial", date: day, yield: 10, ingredientCost: 2, prepMinutes: 8,
  });
  const promoted = promoteTestBatch(saved, saved.recipeTrials[0].id, "cookies");
  assert.equal(promoted.recipes[0].yield, 10);
  assert.equal(promoted.recipes[0].price, 2);
  assert.equal(promoted.recipeVersions[0].recipe.yield, 12);
  assert.equal(saved.recipeTrials[0].recipe.yield, 12);
});

test("pickup caps are enforced and moving an order releases its window", () => {
  const data = workspace();
  const order = { id: "first", recipeId: "cookies", portions: 12, status: "open", pickupDate: day, total: 30, paid: 10 };
  data.orders.push(order, { ...order, id: "second" });
  const saved = savePickupSlot(data, { date: day, start: "10:00", end: "11:00", limit: 1 });
  const slot = saved.pickupSlots[0];
  const booked = assignPickupSlot(saved, order.id, slot.id);
  assert.throws(() => assignPickupSlot(booked, "second", slot.id), /full/);
  const confirmation = pickupConfirmation(booked, booked.orders[0]);
  assert.match(confirmation, /10:00–11:00/);
  assert.match(confirmation, /Keep sealed/);
  assert.match(confirmation, /20\.00/);
  const moved = updateOrder(booked, order.id, "reschedule", { pickupDate: "2026-12-05" });
  assert.equal(moved.orders[0].pickupSlotId, "");
  assert.equal(assignPickupSlot(moved, "second", slot.id).orders[1].pickupSlotId, slot.id);
});

test("menu price previews flag open quotes and preserve accepted totals", () => {
  const data = workspace();
  data.quotes.push({ id: "accepted", recipeId: "cookies" }, { id: "open", recipeId: "cookies" });
  data.orders.push({ quoteId: "accepted", status: "open", total: 30 });
  const preview = previewMenuPrice(data, "cookies", 3);
  assert.ok(preview.proposed.margin > preview.current.margin);
  assert.deepEqual(preview.openQuotes.map((quote) => quote.id), ["open"]);
  const updated = applyMenuPrice(data, "cookies", 3);
  assert.equal(updated.recipes[0].price, 3);
  assert.deepEqual(updated.quotes, data.quotes);
  assert.deepEqual(updated.orders, data.orders);
});

test("one-off purchases recover only the unreusable cost", () => {
  const data = workspace();
  const input = { recipeId: "cookies", portions: 12, margin: 0, extraCost: 0, taxRate: 0 };
  const base = quoteCalculation(data, input);
  const special = quoteCalculation(data, { ...input, oneOffPurchase: 30, oneOffReusable: 12 });
  assert.equal(special.oneOffRecovery, 18);
  assert.equal(special.total - base.total, 18);
  assert.throws(
    () => quoteCalculation(data, { ...input, oneOffPurchase: 10, oneOffReusable: 11 }),
    /cannot exceed/,
  );
});
