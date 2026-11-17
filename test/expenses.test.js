import assert from "node:assert/strict";
import test from "node:test";
import {
  expenseCsv,
  expenseLedger,
  expenseSummary,
  removeExpense,
  saveExpense,
} from "../src/expenses.js";

const base = () => ({ expenses: [] });

test("expenses are validated, categorized and editable without duplication", () => {
  const created = saveExpense(base(), {
    name: "  Kitchen rent  ",
    amount: "1200.456",
    date: "2026-11-01",
    category: "Rent",
    vendor: "  Main Street Properties ",
    paymentMethod: "Bank transfer",
    notes: " November ",
  });
  assert.equal(created.expenses.length, 1);
  assert.equal(created.expenses[0].name, "Kitchen rent");
  assert.equal(created.expenses[0].amount, 1200.46);
  assert.equal(created.expenses[0].vendor, "Main Street Properties");

  const edited = saveExpense(created, {
    ...created.expenses[0],
    amount: 1250,
    notes: "Updated lease amount",
  });
  assert.equal(edited.expenses.length, 1);
  assert.equal(edited.expenses[0].amount, 1250);
  assert.equal(edited.expenses[0].createdAt, created.expenses[0].createdAt);
  assert.match(edited.expenses[0].notes, /Updated lease/);
});

test("expense validation rejects missing descriptions, invalid dates and zero amounts", () => {
  assert.throws(
    () =>
      saveExpense(base(), {
        name: "",
        amount: 10,
        date: "2026-11-01",
      }),
    /description/i,
  );
  assert.throws(
    () =>
      saveExpense(base(), {
        name: "Rent",
        amount: 0,
        date: "2026-11-01",
      }),
    /greater than zero/i,
  );
  assert.throws(
    () =>
      saveExpense(base(), {
        name: "Rent",
        amount: 10,
        date: "2026-02-31",
      }),
    /valid expense date/i,
  );
});

test("the ledger filters, summarizes and exports expense details", () => {
  let data = base();
  data = saveExpense(data, {
    name: "Power",
    amount: 80,
    date: "2026-11-02",
    category: "Utilities",
    vendor: "City Electric",
    paymentMethod: "Card",
  });
  data = saveExpense(data, {
    name: "October rent",
    amount: 900,
    date: "2026-10-01",
    category: "Rent",
    paymentMethod: "Check",
  });
  const rows = expenseLedger(data, {
    month: "2026-11",
    query: "electric",
  });
  assert.equal(rows.length, 1);
  assert.equal(expenseSummary(rows).total, 80);
  assert.equal(expenseSummary(rows).largest.name, "Utilities");
  assert.match(expenseCsv(rows), /City Electric/);
  assert.match(expenseCsv(rows), /"80\.00"/);
});

test("expense deletion is explicit and preserves other records", () => {
  const data = {
    expenses: [
      { id: "keep", name: "Rent" },
      { id: "remove", name: "Fee" },
    ],
  };
  assert.deepEqual(
    removeExpense(data, "remove").expenses.map((row) => row.id),
    ["keep"],
  );
  assert.throws(() => removeExpense(data, "missing"), /missing/i);
});
