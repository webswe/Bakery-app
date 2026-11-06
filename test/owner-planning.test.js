import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeOwnerGoals,
  removeOwnerTask,
  saveOwnerTask,
  taskSummary,
  toggleOwnerTask,
} from "../src/ownerPlanning.js";

test("owner tasks validate, summarize, complete and delete without changing other data", () => {
  const data = { items: [], ownerTasks: [] };
  const saved = saveOwnerTask(data, {
    title: " Call supplier ",
    dueDate: "2026-11-04",
    priority: "high",
    category: "Purchasing",
    notes: " Cocoa ",
  });
  assert.equal(saved.ownerTasks[0].title, "Call supplier");
  assert.equal(saved.items, data.items);
  assert.equal(taskSummary(saved, "2026-11-05").overdue.length, 1);
  const completed = toggleOwnerTask(
    saved,
    saved.ownerTasks[0].id,
    "2026-11-05T12:00:00.000Z",
  );
  assert.equal(taskSummary(completed, "2026-11-05").completed.length, 1);
  assert.equal(
    removeOwnerTask(completed, saved.ownerTasks[0].id).ownerTasks.length,
    0,
  );
  assert.throws(
    () => saveOwnerTask(data, { title: "", dueDate: "2026-11-04" }),
    /title/,
  );
});

test("owner goals normalize invalid and negative values", () => {
  assert.deepEqual(
    normalizeOwnerGoals({
      monthlyRevenue: "2500",
      monthlyProfit: -10,
      weeklyBatches: "bad",
    }),
    {
      monthlyRevenue: 2500,
      monthlyProfit: 0,
      targetMargin: 0,
      cashReserve: 0,
      maxWastePercent: 0,
      weeklyBatches: 0,
      weeklyOwnerHours: 0,
    },
  );
});
