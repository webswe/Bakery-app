import { test } from "node:test";
import assert from "node:assert/strict";
import { removeInventoryItem } from "../src/inventoryCatalog.js";

const fixture = () => ({
  items: [
    { id: "used", name: "Flour", stock: 0 },
    { id: "stock", name: "Sugar", stock: 2 },
    { id: "free", name: "Sprinkles", stock: 0 },
  ],
  recipes: [
    { id: "cake", name: "Cake", lines: [{ itemId: "used" }] },
  ],
  inventoryLots: [],
  purchaseHistory: [{ itemId: "free", itemName: "Sprinkles" }],
});

test("inventory deletion protects recipe references and stock", () => {
  assert.throws(() => removeInventoryItem(fixture(), "used"), /Cake/);
  assert.throws(() => removeInventoryItem(fixture(), "stock"), /zero/);
});

test("inventory deletion removes the catalog item and retains history", () => {
  const next = removeInventoryItem(fixture(), "free");
  assert.equal(next.items.some((item) => item.id === "free"), false);
  assert.equal(next.purchaseHistory[0].itemName, "Sprinkles");
});
