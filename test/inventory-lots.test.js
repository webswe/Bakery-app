import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearInventoryStock,
  consumeLots,
  lotAlerts,
  reconcileLots,
  receiveInventory,
  receiveInventoryMany,
  recordPersonalUse,
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
    {
      id: "later",
      itemId: "milk",
      remaining: 4,
      expiryDate: "2026-12-01",
      receivedAt: "2026-10-01",
    },
    {
      id: "first",
      itemId: "milk",
      remaining: 3,
      expiryDate: "2026-11-01",
      receivedAt: "2026-10-20",
    },
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

test("personal use reduces stock and records a distinct movement", () => {
  const data = {
    items: [{ id: "flour", name: "Flour", stock: 5, unit: "kg" }],
    inventoryLots: [
      { id: "lot", itemId: "flour", remaining: 5, receivedAt: "2026-11-01" },
    ],
    movements: [],
  };
  const next = recordPersonalUse(data, "flour", 2);
  assert.equal(next.items[0].stock, 3);
  assert.equal(next.inventoryLots[0].remaining, 3);
  assert.equal(next.movements[0].kind, "Personal use");
  assert.throws(() => recordPersonalUse(data, "flour", 6), /Only 5/);
});

test("clearing stock retains the catalog item and historical lot details", () => {
  const data = {
    items: [
      {
        id: "milk",
        name: "Evaporated milk",
        stock: 1062,
        unit: "g",
        price: 2.5,
      },
    ],
    inventoryLots: [
      {
        id: "lot-a",
        itemId: "milk",
        remaining: 354,
        receivedAt: "2026-11-01",
      },
      {
        id: "lot-b",
        itemId: "milk",
        remaining: 708,
        receivedAt: "2026-11-03",
      },
    ],
    movements: [],
  };
  const next = clearInventoryStock(data, "milk");
  assert.equal(next.items[0].stock, 0);
  assert.equal(next.items[0].price, 2.5);
  assert.deepEqual(
    next.inventoryLots.map((lot) => lot.remaining),
    [0, 0],
  );
  assert.equal(next.movements[0].kind, "Stock cleared");
  assert.equal(next.movements[0].delta, -1062);
  assert.equal(next.movements[0].reason, "Cleared by owner");
});

test("bulk receiving records every selected item in one operation", () => {
  const data = {
    ...fixture(),
    items: [
      ...fixture().items,
      {
        id: "flour",
        name: "Flour",
        amount: 5,
        unit: "kg",
        price: 8,
        taxMode: "exempt",
        tax: 0,
        stock: 1,
      },
    ],
  };
  const next = receiveInventoryMany(
    data,
    [
      { itemId: "milk", packages: 2, packagePrice: 2 },
      { itemId: "flour", packages: 3, packagePrice: 8 },
      { itemId: "milk", packages: 0, packagePrice: 2 },
    ],
    { receivedAt: "2026-11-14", supplier: "Wholesale market" },
  );
  assert.equal(next.items.find((item) => item.id === "milk").stock, 708);
  assert.equal(next.items.find((item) => item.id === "flour").stock, 16);
  assert.equal(next.inventoryLots.length, 2);
  assert.equal(next.purchaseHistory.length, 2);
  assert.equal(next.movements.length, 2);
  assert.ok(
    next.inventoryLots.every(
      (lot) =>
        lot.supplier === "Wholesale market" &&
        lot.receivedAt === "2026-11-14",
    ),
  );
  assert.throws(
    () =>
      receiveInventoryMany(data, [{ itemId: "milk", packages: 0 }], {
        receivedAt: "2026-11-14",
      }),
    /at least one item/,
  );
});
