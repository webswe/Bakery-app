import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarEntries,
  orderPaid,
  recordPayment,
  taxReport,
  wasteAnalysis,
} from "../src/ownerOps.js";

const fixture = () => ({
  orders: [
    { id: "o", customer: "Ada", recipeName: "Cake", portions: 8, pickupDate: "2026-10-30", status: "open", total: 100, paid: 0 },
  ],
  payments: [],
  productionPlans: [
    { id: "p", recipeId: "r", recipeName: "Cake", date: "2026-10-29", batches: 2, status: "planned" },
  ],
  recipes: [],
  sales: [
    { date: "2026-10-20", net: 100, tax: 7, taxRate: 7, total: 107 },
  ],
  purchaseHistory: [
    { date: "2026-10-21", packagePrice: 10, finalPackageCost: 10, taxAmount: 0.7, packages: 2 },
  ],
  waste: [
    { date: "2026-10-22", name: "Cream", reason: "Expired", cost: 3 },
    { date: "2026-10-23", name: "Cream", reason: "Spill", cost: 2 },
  ],
});

test("payment ledger supports partial payments and refunds with order limits", () => {
  let data = recordPayment(fixture(), "o", {
    amount: 60,
    kind: "payment",
    method: "Card",
    date: "2026-10-27",
  });
  data = recordPayment(data, "o", {
    amount: 10,
    kind: "refund",
    method: "Card",
    date: "2026-10-28",
  });
  assert.equal(orderPaid(data, data.orders[0]), 50);
  assert.equal(data.orders[0].paid, 50);
  assert.throws(
    () => recordPayment(data, "o", { amount: 51, kind: "refund", date: "2026-10-28" }),
    /exceeds/,
  );
});

test("owner reports retain tax, schedule and waste detail", () => {
  const data = fixture();
  const tax = taxReport(data, "2026-10");
  assert.equal(tax.customerTax, 7);
  assert.equal(tax.purchaseTax, 1.4);
  assert.deepEqual(calendarEntries(data, "2026-10").map((row) => row.type), [
    "Production",
    "Pickup",
  ]);
  const waste = wasteAnalysis(data, "2026-10");
  assert.equal(waste.total, 5);
  assert.equal(waste.byItem[0].cost, 5);
});
