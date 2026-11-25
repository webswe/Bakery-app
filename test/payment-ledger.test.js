import assert from "node:assert/strict";
import test from "node:test";
import {
  directSalePaid,
  linkedPaymentTotal,
  orderPaid,
  removePaymentEntry,
} from "../src/paymentLedger.js";

test("shared payment totals keep refunds and legacy order balances consistent", () => {
  const data = {
    payments: [
      { id: "payment", orderId: "order", amount: 40, kind: "payment" },
      { id: "refund", orderId: "order", amount: 10, kind: "refund" },
    ],
  };
  assert.equal(linkedPaymentTotal(data.payments, "orderId", "order"), 30);
  assert.equal(orderPaid(data, { id: "order", paid: 99 }), 30);
  assert.equal(orderPaid({ payments: [] }, { id: "legacy", paid: 25 }), 25);
});

test("removing an open-order payment recalculates its saved balance", () => {
  const data = {
    payments: [
      { id: "first", orderId: "order", amount: 20, kind: "payment" },
      { id: "second", orderId: "order", amount: 15, kind: "payment" },
    ],
    orders: [{ id: "order", total: 50, paid: 35, status: "open" }],
    sales: [],
  };
  const next = removePaymentEntry(data, "second");
  assert.equal(next.payments.length, 1);
  assert.equal(next.orders[0].paid, 20);
});

test("completed order payments stay protected from destructive correction", () => {
  const data = {
    payments: [
      { id: "payment", orderId: "order", amount: 50, kind: "payment" },
    ],
    orders: [{ id: "order", total: 50, paid: 50, status: "fulfilled" }],
    sales: [],
  };
  assert.throws(
    () => removePaymentEntry(data, "payment"),
    /cannot be removed/i,
  );
});

test("removing direct-sale entries reopens the correct receivable balance", () => {
  const data = {
    payments: [
      { id: "first", saleId: "sale", amount: 20, kind: "payment" },
      { id: "final", saleId: "sale", amount: 30, kind: "payment" },
    ],
    orders: [],
    sales: [
      {
        id: "sale",
        total: 50,
        amountPaid: 50,
        paymentStatus: "paid",
        payment: "Card",
        paidAt: "2026-11-24T10:00:00.000Z",
      },
    ],
  };
  const partial = removePaymentEntry(data, "final");
  assert.equal(directSalePaid(partial, partial.sales[0]), 20);
  assert.equal(partial.sales[0].amountPaid, 20);
  assert.equal(partial.sales[0].paymentStatus, "partial");
  assert.equal(partial.sales[0].payment, "Partial");
  assert.equal(partial.sales[0].paidAt, undefined);

  const unpaid = removePaymentEntry(partial, "first");
  assert.equal(unpaid.sales[0].amountPaid, 0);
  assert.equal(unpaid.sales[0].paymentStatus, "unpaid");
  assert.equal(unpaid.sales[0].payment, "Unpaid");
});
