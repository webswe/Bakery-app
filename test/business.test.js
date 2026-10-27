import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateData } from "../src/analytics.js";
import {
  createOrder,
  updateOrder,
  recordWaste,
  scaleRecipe,
  shoppingList,
  stockAlerts,
  toggleChecklist,
} from "../src/business.js";
import { savePlan, completePlan } from "../src/planning.js";
import {
  persistWorkspace,
  readBackups,
  storageKey,
} from "../src/backupStorage.js";
const fixture = () =>
  migrateData({
    items: [
      {
        id: "milk",
        name: "Milk",
        amount: 1,
        unit: "can",
        price: 4,
        taxIncluded: true,
        stock: 5,
        minStock: 2,
        supplier: "Dairy",
        expiryDate: "2026-10-26",
      },
    ],
    recipes: [
      {
        id: "r",
        name: "Dessert",
        yield: 10,
        price: 5,
        lines: [{ itemId: "milk", amount: 1, unit: "can" }],
        laborMinutes: 30,
      },
    ],
    quotes: [
      {
        id: "q",
        recipeId: "r",
        customer: "Emma",
        snapshot: {
          total: 50,
          recipeName: "Dessert",
          portions: 10,
          batches: 1,
        },
      },
    ],
    sales: [],
    expenses: [],
    customField: "keep",
  });
test("orders retain quoted prices, create linked tasks, track deposits and fulfill exactly once", () => {
  let d = createOrder(fixture(), {
    quoteId: "q",
    pickupDate: "2026-10-28",
    deposit: 10,
  });
  const id = d.orders[0].id;
  assert.equal(d.productionPlans[0].orderId, id);
  assert.equal(d.sales.length, 0);
  assert.throws(() => updateOrder(d, id, "payment", { paid: 51 }), /exceeds/);
  assert.throws(() => updateOrder(d, id, "fulfill"), /full payment/);
  d = updateOrder(d, id, "reschedule", { pickupDate: "2026-10-29" });
  assert.equal(d.productionPlans[0].date, "2026-10-29");
  d = completePlan(d, d.productionPlans[0].id);
  d = updateOrder(d, id, "payment", { paid: 50 });
  d = updateOrder(d, id, "fulfill");
  assert.equal(d.sales.length, 1);
  assert.equal(d.sales[0].orderId, id);
  assert.equal(d.sales[0].total, 50);
  assert.equal(d.products.r.quantity, 0);
  assert.throws(() => updateOrder(d, id, "fulfill"), /no longer open/);
  assert.equal(d.customField, "keep");
});
test("cancelling removes only pending linked tasks and preserves deposits", () => {
  let d = createOrder(fixture(), {
    quoteId: "q",
    pickupDate: "2026-10-28",
    deposit: 10,
  });
  d = updateOrder(d, d.orders[0].id, "cancel");
  assert.equal(d.productionPlans.length, 0);
  assert.equal(d.orders[0].paid, 10);
  assert.equal(d.items[0].stock, 5);
});
test("shopping combines production and safety stock, estimates whole packages, flags unpriced stock", () => {
  let d = savePlan(fixture(), {
    recipeId: "r",
    date: "2026-10-28",
    batches: 4,
  });
  const list = shoppingList(d, "2026-10-28");
  assert.equal(list.rows[0].packages, 1);
  assert.equal(list.rows[0].estimate, 4);
  assert.equal(list.rows[0].supplier, "Dairy");
  d.items[0].needsPrice = true;
  assert.equal(shoppingList(d, "2026-10-28").rows[0].estimate, null);
  assert.equal(stockAlerts(d, "2026-10-27").length, 1);
});
test("ingredient and dessert waste deduct stock with one captured expense and no mutation on failure", () => {
  let d = fixture();
  const before = structuredClone(d);
  assert.throws(
    () =>
      recordWaste(d, {
        kind: "ingredient",
        itemId: "milk",
        amount: 6,
        date: "2026-10-27",
      }),
    /exceeds/,
  );
  assert.deepEqual(d, before);
  d = recordWaste(d, {
    kind: "ingredient",
    itemId: "milk",
    amount: 1,
    date: "2026-10-27",
    reason: "Expired",
  });
  assert.equal(d.items[0].stock, 4);
  assert.equal(d.expenses[0].amount, 4);
  d.products.r = { quantity: 10, value: 20 };
  d = recordWaste(d, {
    kind: "product",
    itemId: "r",
    amount: 2,
    date: "2026-10-27",
  });
  assert.equal(d.products.r.quantity, 8);
  assert.equal(d.products.r.value, 16);
  assert.equal(d.expenses[1].amount, 4);
  assert.throws(
    () =>
      recordWaste(d, {
        kind: "product",
        itemId: "r",
        amount: 0.5,
        date: "2026-10-27",
      }),
    /whole/,
  );
});
test("recipe scaling preserves source and checklist edits preserve order linkage", () => {
  let d = createOrder(fixture(), {
    quoteId: "q",
    pickupDate: "2026-10-28",
    deposit: 0,
  });
  const before = structuredClone(d),
    r = scaleRecipe(d, "r", 25);
  assert.equal(r.lines[0].amount, 2.5);
  assert.equal(r.laborMinutes, 75);
  assert.deepEqual(d, before);
  const id = d.productionPlans[0].id;
  d = toggleChecklist(d, id, "Bake");
  d = savePlan(d, { recipeId: "r", date: "2026-10-28", batches: 2 }, id);
  assert.equal(d.productionPlans[0].checklist.Bake, true);
  assert.equal(d.productionPlans[0].orderId, d.orders[0].id);
});
test("daily backups retain first pre-change state, cap history, and block destructive overwrite on storage errors", () => {
  const map = new Map(),
    storage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    };
  storage.setItem(storageKey, JSON.stringify(fixture()));
  persistWorkspace(storage, { n: 1 }, "2026-10-01");
  persistWorkspace(storage, { n: 2 }, "2026-10-01");
  assert.equal(readBackups(storage).length, 1);
  assert.equal(readBackups(storage)[0].data.customField, "keep");
  for (let i = 2; i <= 16; i++)
    persistWorkspace(
      storage,
      { n: i },
      "2026-10-" + String(i).padStart(2, "0"),
    );
  assert.equal(readBackups(storage).length, 14);
  const previous = storage.getItem(storageKey);
  assert.throws(
    () =>
      persistWorkspace(
        {
          ...storage,
          setItem: () => {
            throw Error("quota");
          },
        },
        { bad: true },
        "2026-10-17",
      ),
    /quota/,
  );
  assert.equal(storage.getItem(storageKey), previous);
  storage.setItem(storageKey, "invalid");
  assert.throws(() => persistWorkspace(storage, {}, "2026-10-17"));
  assert.equal(storage.getItem(storageKey), "invalid");
});

test("explicit recovery retains unreadable originals before replacing them", () => {
  const map = new Map([[storageKey, "broken json"]]),
    storage = {
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    };
  persistWorkspace(storage, fixture(), "2026-10-27", true);
  assert.equal(storage.getItem("bakery-ledger-unreadable-v1"), "broken json");
  assert.equal(JSON.parse(storage.getItem(storageKey)).customField, "keep");
});
