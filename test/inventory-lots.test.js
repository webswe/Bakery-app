import { test } from "node:test";
import assert from "node:assert/strict";
import {
  consumeLots,
  lotAlerts,
  reconcileLots,
  receiveInventory,
} from "../src/inventoryLots.js";

const fixture = () => ({
  items: [
    {
      id: "milk",
      name: "Evaporated milk",
      amount: 354,
      unit: "g",
      price: 2,
      taxMode: "added",
      tax: 10,
      stock: 0,
      supplier: "Dairy Co",
    },
  ],
  inventoryLots: [],
  purchaseHistory: [],
  movements: [],
});

test("receipts preserve lot, supplier, cost and purchase tax snapshots", () => {
  const data = receiveInventory(fixture(), "milk", {
    packages: 2,
    packagePrice: 2.5,
    receivedAt: "2026-10-27",
    expiryDate: "2026-11-02",
    supplier: "Market",
  });
  assert.equal(data.items[0].stock, 708);
  assert.equal(data.inventoryLots[0].remaining, 708);
  assert.equal(data.purchaseHistory[0].finalPackageCost, 2.75);
  assert.equal(data.purchaseHistory[0].taxAmount, 0.25);
  assert.equal(data.purchaseHistory[0].supplier, "Market");
});

test("lot consumption uses earliest expiry first without mutating input", () => {
  const lots = [
    { id: "later", itemId: "milk", remaining: 4, expiryDate: "2026-12-01", receivedAt: "2026-10-01" },
    { id: "first", itemId: "milk", remaining: 3, expiryDate: "2026-11-01", receivedAt: "2026-10-20" },
  ];
  const result = consumeLots(lots, "milk", 5);
  assert.equal(lots[0].remaining, 4);
  assert.deepEqual(result.usage, [
    { lotId: "first", amount: 3 },
    { lotId: "later", amount: 2 },
  ]);
  assert.equal(result.lots.find((lot) => lot.id === "later").remaining, 2);
  assert.equal(
    lotAlerts({ inventoryLots: lots, items: fixture().items }, "2026-11-02")[0]
      .expired,
    true,
  );
  const counted = reconcileLots(lots, "milk", 2);
  assert.equal(
    counted.reduce((sum, lot) => sum + lot.remaining, 0),
    2,
  );
});
