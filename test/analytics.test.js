import { test } from "node:test";
import assert from "node:assert/strict";
import {
  monthlySummary,
  previousMonth,
  migrateData,
} from "../src/analytics.js";
test("monthly P/L filters dates and reports losses accurately", () => {
  const s = monthlySummary(
    {
      sales: [
        { date: "2026-10-01", total: 100, cost: 40, quantity: 5 },
        { date: "2026-09-01", total: 900, cost: 0, quantity: 1 },
      ],
      expenses: [{ date: "2026-10-04", amount: 80 }],
    },
    "2026-10",
  );
  assert.equal(s.revenue, 100);
  assert.equal(s.profit, -20);
  assert.equal(s.portions, 5);
  assert.equal(s.orders, 1);
});
test("previous month crosses year boundary", () =>
  assert.equal(previousMonth("2026-01"), "2025-12"));
test("old backups retain purchase rates and gain tax categories", () => {
  const d = migrateData({ tax: 7, items: [{ type: "packaging", tax: 9 }] });
  assert.deepEqual(d.taxRates, { food: 7, other: 7 });
  assert.equal(d.items[0].tax, 9);
  assert.equal(d.items[0].taxCategory, "other");
});
