import { test } from "node:test";
import assert from "node:assert/strict";
import { customerActivity, ensureCustomer, saveCustomer } from "../src/customerOps.js";
import { allocateDocumentNumber, displayDocumentNumber } from "../src/documentOps.js";

const fixture = () => ({
  customers: [],
  quotes: [],
  orders: [],
  sales: [],
  documentCounters: {},
});

test("customer records retain preferences and connect legacy activity by name", () => {
  let data = saveCustomer(fixture(), {
    name: "Emma",
    phone: "555-0100",
    allergies: "Peanuts",
    preferences: "Chocolate",
  });
  const customer = data.customers[0];
  data = {
    ...data,
    orders: [{ id: "o", customer: "Emma", total: 50, pickupDate: "2026-10-30" }],
  };
  assert.equal(customer.allergies, "Peanuts");
  assert.equal(customerActivity(data, customer).orderTotal, 50);
  assert.throws(() => saveCustomer(data, { name: " emma " }), /already exists/);
});

test("new customer names are created once and linked", () => {
  const first = ensureCustomer(fixture(), { customer: "Ada" });
  const second = ensureCustomer(first.data, { customer: "ada" });
  assert.equal(first.data.customers.length, 1);
  assert.equal(second.data.customers.length, 1);
  assert.equal(second.customerId, first.customerId);
});

test("document numbers increment independently by type and year", () => {
  const quote = allocateDocumentNumber(fixture(), "quote", "2026-10-27");
  const next = allocateDocumentNumber(
    { ...fixture(), documentCounters: quote.documentCounters },
    "quote",
    "2026-11-01",
  );
  const invoice = allocateDocumentNumber(
    { ...fixture(), documentCounters: next.documentCounters },
    "invoice",
    "2026-11-01",
  );
  assert.equal(quote.number, "Q-2026-0001");
  assert.equal(next.number, "Q-2026-0002");
  assert.equal(invoice.number, "INV-2026-0001");
  assert.equal(displayDocumentNumber({ quoteNumber: quote.number }, "quote"), quote.number);
});
