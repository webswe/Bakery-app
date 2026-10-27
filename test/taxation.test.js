import { test } from "node:test";
import assert from "node:assert/strict";
import {
  purchaseTax,
  purchaseMode,
  customerTax,
  directSaleTotals,
  saleRevenue,
  taxRate,
} from "../src/taxation.js";
import { lineCost } from "../src/costing.js";
import { migrateData, monthlySummary } from "../src/analytics.js";
import { sell, produce } from "../src/operations.js";
import { saveQuote } from "../src/planning.js";
import {
  createOrder,
  updateOrder,
  shoppingList,
  recordWaste,
} from "../src/business.js";
const approx = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} vs ${b}`);
const fixture = () =>
  migrateData({
    taxRates: { food: 7, other: 9 },
    salesTaxRate: 8.25,
    items: [
      {
        id: "i",
        name: "Milk",
        price: 10,
        amount: 1,
        unit: "can",
        tax: 7,
        taxMode: "added",
        stock: 1,
        minStock: 2,
      },
    ],
    recipes: [
      {
        id: "r",
        name: "Dessert",
        yield: 1,
        price: 10,
        lines: [{ itemId: "i", amount: 1, unit: "can" }],
      },
    ],
    products: { r: { quantity: 10, value: 50 } },
    sales: [{ id: "old", date: "2026-10-01", quantity: 1, total: 10, cost: 2 }],
    expenses: [],
  });
test("added, included and exempt taxes have distinct transparent breakdowns", () => {
  const added = purchaseTax({ price: 10, tax: 7, taxMode: "added" });
  approx(added.total, 10.7);
  approx(added.tax, 0.7);
  const inc = purchaseTax({ price: 10.7, tax: 7, taxMode: "included" });
  approx(inc.base, 10);
  approx(inc.tax, 0.7);
  assert.equal(inc.total, 10.7);
  const ex = purchaseTax({ price: 10, tax: 7, taxMode: "exempt" });
  assert.equal(ex.tax, 0);
  assert.equal(ex.total, 10);
  assert.throws(() => taxRate(101));
  assert.throws(() => taxRate(-1));
  assert.throws(() => taxRate(""));
  assert.equal(taxRate(0), 0);
});
test("legacy tax flags keep exact historical package and proportional costs", () => {
  for (const included of [true, false]) {
    const i = {
      id: "i",
      price: 1.79,
      amount: 397,
      unit: "g",
      tax: 7,
      taxIncluded: included,
    };
    const prior = i.price * (included ? 1 : 1 + i.tax / 100);
    assert.equal(purchaseTax(i).total, prior);
    assert.equal(
      lineCost({ itemId: "i", amount: 100, unit: "g" }, [i]).cost,
      (100 / 397) * prior,
    );
    assert.equal(purchaseMode(i), included ? "legacy" : "added");
  }
  const old = fixture();
  delete old.salesTaxRate;
  const copy = structuredClone(old);
  const migrated = migrateData(old);
  assert.equal(migrated.salesTaxRate, 0);
  assert.deepEqual(migrated.sales, copy.sales);
  assert.deepEqual(migrated.items, copy.items);
  assert.deepEqual(old, copy);
});
test("tax is rounded after discount, with zero tax and invalid discounts handled", () => {
  assert.deepEqual(directSaleTotals(10, 2, 1, 8.25), {
    subtotal: 20,
    discount: 1,
    net: 19,
    tax: 1.57,
    taxRate: 8.25,
    total: 20.57,
  });
  assert.equal(customerTax(0.05, 10).tax, 0.01);
  assert.equal(customerTax(10, 0).total, 10);
  assert.throws(() => directSaleTotals(10, 1, 11, 7), /Discount/);
});
test("direct sales recalculate tax from price and retain immutable revenue and cost snapshots", () => {
  const d = fixture(),
    before = structuredClone(d),
    next = sell(d, {
      recipe: "r",
      quantity: 2,
      discount: 1,
      taxRate: 8.25,
      total: 999,
      date: "2026-10-02",
    }),
    sale = next.sales.at(-1);
  assert.equal(sale.total, 20.57);
  assert.equal(sale.net, 19);
  assert.equal(sale.tax, 1.57);
  assert.equal(sale.cost, 10);
  assert.deepEqual(d, before);
  assert.equal(next.products.r.quantity, 8);
  next.salesTaxRate = 20;
  assert.equal(sale.taxRate, 8.25);
  const summary = monthlySummary(next, "2026-10");
  assert.equal(summary.revenue, 29);
  assert.equal(summary.collectedTax, 1.57);
  assert.equal(saleRevenue(d.sales[0]), 10);
});
test("quoted tax survives acceptance, future defaults, recipe prices and order fulfillment", () => {
  let d = saveQuote(fixture(), {
    recipeId: "r",
    portions: 1,
    margin: 0,
    extraCost: 0,
    taxRate: 8.25,
    date: "2026-10-27",
    customer: "Emma",
  });
  const q = d.quotes[0];
  assert.equal(q.snapshot.subtotal, 10.7);
  assert.equal(q.snapshot.tax, 0.88);
  assert.equal(q.snapshot.total, 11.58);
  d = createOrder(d, {
    quoteId: q.id,
    pickupDate: "2026-10-28",
    deposit: 11.58,
  });
  d.salesTaxRate = 20;
  d.recipes[0].price = 99;
  d = updateOrder(d, d.orders[0].id, "fulfill");
  const sale = d.sales.at(-1);
  assert.equal(sale.total, 11.58);
  assert.equal(sale.net, 10.7);
  assert.equal(sale.tax, 0.88);
  assert.equal(sale.taxRate, 8.25);
  assert.throws(
    () =>
      sell(fixture(), {
        recipe: "r",
        quantity: 1,
        total: 12,
        taxSnapshot: { net: 10, tax: 1, taxRate: 10 },
      }),
    /breakdown/,
  );
});
test("shopping, waste and production use the same tax-inclusive purchase cost", () => {
  const d = fixture();
  approx(shoppingList(d, "2026-10-27").rows[0].estimate, 10.7);
  approx(
    recordWaste(d, {
      kind: "ingredient",
      itemId: "i",
      amount: 1,
      date: "2026-10-27",
    }).waste[0].cost,
    10.7,
  );
  approx(produce(d, "r", 1).products.r.value, 60.7);
  assert.deepEqual(d.taxRates, { food: 7, other: 9 });
});
