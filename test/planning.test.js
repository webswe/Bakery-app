import { test } from "node:test";
import assert from "node:assert/strict";
import { convertItem, convert, lineCost } from "../src/costing.js";
import { migrateData } from "../src/analytics.js";
import {
  quoteCalculation,
  saveQuote,
  savePlan,
  completePlan,
  inventoryForecast,
} from "../src/planning.js";
const fixture = () =>
  migrateData({
    tax: 7,
    items: [
      {
        id: "milk",
        name: "Condensed milk",
        amount: 1,
        unit: "can",
        gramsPerCan: 397,
        gramsPerCup: 306,
        price: 4,
        taxIncluded: true,
        stock: 2,
      },
      {
        id: "box",
        name: "Box",
        amount: 10,
        unit: "each",
        price: 10,
        taxIncluded: true,
        stock: 15,
      },
    ],
    recipes: [
      {
        id: "dessert",
        name: "Milk desserts",
        yield: 10,
        price: 4,
        laborMinutes: 30,
        lines: [
          { itemId: "milk", amount: 198.5, unit: "g" },
          { itemId: "milk", amount: 0.5, unit: "can" },
          { itemId: "box", amount: 10, unit: "each" },
        ],
      },
    ],
    sales: [{ id: "old-sale", cost: 7, total: 12 }],
    expenses: [],
    settings: { hourlyWage: 12, electricityRate: 0 },
    extraField: "keep",
  });
test("editable can weights work both ways with fractional cans, cups, and stock units", () => {
  const milk = fixture().items[0];
  assert.equal(convertItem(2, "can", "g", milk), 794);
  assert.equal(convertItem(397, "g", "can", milk), 1);
  assert.equal(
    convertItem(1, "can", "kg", { ...milk, gramsPerCan: 354 }),
    0.354,
  );
  assert.equal(
    convertItem(2, "can", "each", { ...milk, gramsPerEach: 397 }),
    2,
  );
  assert.ok(Math.abs(convertItem(1, "cup", "can", milk) - 306 / 397) < 1e-9);
  assert.equal(
    lineCost({ itemId: "milk", amount: 0.5, unit: "can" }, [milk]).cost,
    2,
  );
  assert.throws(() => convertItem(1, "can", "g", {}), /grams per can/);
  assert.throws(() => convert(1, "can", "g", 1), /conversion/);
});
test("migration preserves legacy financial records, inventory and unknown fields without changing input", () => {
  const old = fixture();
  delete old.quotes;
  delete old.productionPlans;
  const before = structuredClone(old),
    next = migrateData(old);
  assert.deepEqual(old, before);
  assert.deepEqual(next.sales, old.sales);
  assert.deepEqual(next.items, old.items);
  assert.equal(next.extraField, "keep");
  assert.deepEqual(next.quotes, []);
  assert.deepEqual(next.productionPlans, []);
  const withPlans = {
    ...next,
    quotes: [{ id: "q" }],
    productionPlans: [{ id: "p" }],
  };
  assert.deepEqual(migrateData(withPlans), withPlans);
});
test("quotes charge whole batches and snapshot full costs, true margin and tax", () => {
  const data = fixture(),
    input = {
      recipeId: "dessert",
      portions: 11,
      margin: 20,
      extraCost: 10,
      taxRate: 5,
      date: "2026-10-27",
    };
  const q = quoteCalculation(data, input);
  assert.equal(q.batches, 2);
  assert.equal(q.producedPortions, 20);
  assert.equal(q.cost, 50);
  assert.equal(q.subtotal, 62.5);
  assert.equal(q.tax, 3.13);
  assert.equal(q.total, 65.63);
  const saved = saveQuote(data, input),
    original = structuredClone(saved.quotes[0].snapshot);
  saved.items[0].price = 20;
  assert.deepEqual(saved.quotes[0].snapshot, original);
  assert.equal(saveQuote(saved, input, saved.quotes[0].id).quotes.length, 1);
  assert.throws(
    () => quoteCalculation(data, { ...input, margin: 100 }),
    /Margin/,
  );
  assert.throws(
    () => quoteCalculation(data, { ...input, portions: 1.5 }),
    /whole portions/,
  );
  assert.throws(
    () => saveQuote(data, { ...input, date: "2026-02-30" }),
    /date/,
  );
  assert.throws(
    () =>
      quoteCalculation(
        { ...data, items: data.items.map((i) => ({ ...i, needsPrice: true })) },
        input,
      ),
    /prices/,
  );
});
test("forecasts aggregate repeated ingredients and shared plans, including overdue work", () => {
  let data = fixture();
  data = savePlan(
    data,
    { recipeId: "dessert", batches: 1, date: "2026-10-25" },
    "first",
  );
  data = savePlan(
    data,
    { recipeId: "dessert", batches: 2, date: "2026-10-28" },
    "second",
  );
  data = savePlan(
    data,
    { recipeId: "dessert", batches: 10, date: "2026-11-01" },
    "later",
  );
  const f = inventoryForecast(data, "2026-10-28"),
    milk = f.items.find((i) => i.id === "milk"),
    box = f.items.find((i) => i.id === "box");
  assert.equal(f.plans.length, 2);
  assert.equal(milk.needed, 3);
  assert.equal(milk.shortage, 1);
  assert.equal(milk.packages, 1);
  assert.equal(box.needed, 30);
  assert.equal(box.shortage, 15);
  assert.equal(box.packages, 2);
  assert.equal(box.shortageDate, "2026-10-28");
  assert.equal(data.items[0].stock, 2);
  const bad = { ...data, recipes: [] };
  assert.equal(inventoryForecast(bad, "2026-10-28").errors.length, 2);
});
test("completion consumes inventory once, preserves history, and excludes completed work from forecasts", () => {
  const data = savePlan(
      fixture(),
      { recipeId: "dessert", batches: 1, date: "2026-10-27" },
      "task",
    ),
    before = structuredClone(data);
  const done = completePlan(data, "task");
  assert.deepEqual(data, before);
  assert.equal(done.items[0].stock, 1);
  assert.equal(done.items[1].stock, 5);
  assert.deepEqual(done.products.dessert, { quantity: 10, value: 20 });
  assert.deepEqual(done.sales, data.sales);
  assert.equal(done.productionPlans[0].status, "completed");
  assert.equal(inventoryForecast(done, "2026-10-27").plans.length, 0);
  assert.throws(() => completePlan(done, "task"), /no longer pending/);
  assert.throws(
    () =>
      savePlan(
        done,
        { recipeId: "dessert", batches: 1, date: "2026-10-27" },
        "task",
      ),
    /cannot be edited/,
  );
  assert.throws(
    () =>
      completePlan(
        savePlan(
          fixture(),
          { recipeId: "dessert", batches: 3, date: "2026-10-27" },
          "too-many",
        ),
        "too-many",
      ),
    /Insufficient/,
  );
  assert.throws(
    () =>
      savePlan(data, { recipeId: "dessert", batches: 1.2, date: "2026-10-27" }),
    /whole batches/,
  );
});
