import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readRecentPages,
  rememberPage,
  workspaceNotifications,
} from "../src/qol.js";

test("recent pages stay unique, ordered and bounded", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  let pages = [];
  for (const page of [
    "Overview",
    "Orders",
    "Recipes",
    "Orders",
    "Inventory",
    "Quotes",
    "Customers",
    "Payments",
  ])
    pages = rememberPage(storage, pages, page);
  assert.deepEqual(readRecentPages(storage), [
    "Payments",
    "Customers",
    "Quotes",
    "Inventory",
    "Orders",
    "Recipes",
  ]);
});

test("workspace alerts combine owner, order and inventory attention", () => {
  const rows = workspaceNotifications(
    {
      ownerTasks: [{ id: "late", dueDate: "2026-11-03", completedAt: "" }],
      orders: [{ id: "pickup", status: "open", pickupDate: "2026-11-04" }],
      items: [{ id: "flour", stock: 0, minStock: 1, needsPrice: true }],
    },
    "2026-11-04",
  );
  assert.deepEqual(
    rows.map((row) => row.id),
    ["overdue-tasks", "pickup-orders", "low-stock", "missing-prices"],
  );
});
