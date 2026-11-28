import assert from "node:assert/strict";
import test from "node:test";
import {
  parseWorkspaceBackup,
  persistWorkspace,
  readBackups,
  storageKey,
} from "../src/backupStorage.js";

class MemoryStorage {
  constructor(values = {}, failKey = "") {
    this.values = new Map(Object.entries(values));
    this.failKey = failKey;
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    if (key === this.failKey) throw Error("Storage quota exceeded");
    this.values.set(key, String(value));
  }
}

test("a damaged backup index does not block saving the active workspace", () => {
  const storage = new MemoryStorage({
    [storageKey]: JSON.stringify({ items: [{ id: "old" }] }),
    "bakery-ledger-backups-v1": "{not-json",
  });
  const next = { items: [{ id: "new" }] };
  persistWorkspace(storage, next, "2026-11-17");
  assert.deepEqual(JSON.parse(storage.getItem(storageKey)), next);
  assert.equal(
    storage.getItem("bakery-ledger-backups-unreadable-v1"),
    "{not-json",
  );
  assert.equal(readBackups(storage).length, 1);
});

test("backup quota failures do not discard the newly saved workspace", () => {
  const storage = new MemoryStorage(
    { [storageKey]: JSON.stringify({ items: [{ id: "old" }] }) },
    "bakery-ledger-backups-v1",
  );
  const next = { items: [{ id: "new" }] };
  persistWorkspace(storage, next, "2026-11-17");
  assert.deepEqual(JSON.parse(storage.getItem(storageKey)), next);
});

test("an unreadable active workspace still requires an explicit restore", () => {
  const storage = new MemoryStorage({ [storageKey]: "{broken" });
  assert.throws(
    () => persistWorkspace(storage, { items: [] }, "2026-11-17"),
    /restore a valid backup/i,
  );
  assert.equal(storage.getItem(storageKey), "{broken");
});

test("import validation keeps legacy fields and rejects unknown units", () => {
  const backup = {
    items: [{ id: "flour", name: "Flour", unit: "g", amount: 500, price: 2 }],
    recipes: [{ yield: 8, lines: [{ itemId: "flour", amount: 100, unit: "g" }] }],
    sales: [],
    expenses: [],
    legacyField: { keep: true },
  };
  assert.deepEqual(parseWorkspaceBackup(JSON.stringify(backup)), backup);
  backup.items[0].unit = "constructor";
  assert.throws(
    () => parseWorkspaceBackup(JSON.stringify(backup)),
    /Invalid ingredient/,
  );
});
