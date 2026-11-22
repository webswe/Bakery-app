import assert from "node:assert/strict";
import test from "node:test";
import {
  bookkeepingCsv,
  cashFlowForecast,
  productionRecommendations,
  recordOwnerUse,
  saveCashPlan,
} from "../src/ownerDecisionSupport.js";

const fixture = () => ({
  items: [
    {
      id: "flour",
      name: "Flour",
      amount: 1000,
      unit: "g",
      price: 4,
      stock: 2000,
      taxMode: "exempt",
      type: "ingredient",
    },
  ],
  recipes: [
    {
      id: "cake",
      name: "Cake",
      yield: 8,
      price: 5,
      saleFormat: "individual",
      saleQuantity: 1,
      salePrice: 5,
      lines: [{ itemId: "flour", amount: 400, unit: "g" }],
    },
  ],
  products: { cake: { quantity: 2, value: 8 } },
  productLots: [
    {
      id: "finished-lot",
      recipeId: "cake",
      recipeName: "Cake",
      producedAt: "2026-11-20",
      bestBefore: "2026-11-25",
      quantity: 2,
      remaining: 2,
      cost: 8,
    },
  ],
  inventoryLots: [
    {
      id: "flour-lot",
      itemId: "flour",
      receivedAt: "2026-11-01",
      expiryDate: "2027-01-01",
      quantity: 2000,
      remaining: 2000,
      unit: "g",
    },
  ],
  sales: [
    {
      id: "recent-sale",
      date: "2026-11-20",
      recipeId: "cake",
      name: "Cake",
      quantity: 14,
      total: 70,
      net: 70,
      tax: 0,
      cost: 28,
      paymentStatus: "paid",
    },
  ],
  orders: [
    {
      id: "order",
      status: "accepted",
      pickupDate: "2026-11-25",
      recipeId: "cake",
      recipeName: "Cake",
      customer: "Emma",
      portions: 8,
      total: 50,
    },
  ],
  productionPlans: [],
  payments: [],
  expenses: [],
  purchaseHistory: [],
  waste: [],
  movements: [],
  cashFlowPlans: [],
  personalUseRecords: [],
  settings: {
    hourlyWage: 0,
    electricityRate: 0,
    finance: {
      openingCashByMonth: { "2026-11": 100 },
    },
    ownerGoals: {},
  },
});

test("production guide combines recent sales, orders, stock and planned batches", () => {
  const data = fixture();
  data.productionPlans.push({
    id: "planned",
    recipeId: "cake",
    date: "2026-11-23",
    batches: 1,
    status: "planned",
  });
  const [row] = productionRecommendations(data, "2026-11-22", 7);
  assert.equal(row.orderDemand, 8);
  assert.equal(row.onHand, 2);
  assert.equal(row.scheduled, 8);
  assert.equal(row.forecastDemand, 12);
  assert.equal(row.portionsToMake, 2);
  assert.equal(row.batches, 1);
});

test("personal use removes ingredient lots without recording waste", () => {
  const next = recordOwnerUse(fixture(), {
    kind: "ingredient",
    recordId: "flour",
    quantity: 250,
    date: "2026-11-22",
    note: "Owner household",
  });
  assert.equal(next.items[0].stock, 1750);
  assert.equal(next.inventoryLots[0].remaining, 1750);
  assert.equal(next.personalUseRecords[0].cost, 1);
  assert.equal(next.personalUseRecords[0].kind, "ingredient");
  assert.equal(next.waste.length, 0);
});

test("personal use removes finished portions and their tracked lot", () => {
  const next = recordOwnerUse(fixture(), {
    kind: "dessert",
    recordId: "cake",
    quantity: 1,
    date: "2026-11-22",
  });
  assert.equal(next.products.cake.quantity, 1);
  assert.equal(next.products.cake.value, 4);
  assert.equal(next.productLots[0].remaining, 1);
  assert.equal(next.personalUseRecords[0].cost, 4);
});

test("cash flow forecast combines receivables and owner plans", () => {
  let data = fixture();
  data = saveCashPlan(data, {
    name: "Market fee",
    date: "2026-11-24",
    direction: "out",
    amount: 20,
    category: "Events",
  });
  const forecast = cashFlowForecast(data, "2026-11-22", 14);
  assert.equal(forecast.opening, 170);
  assert.equal(forecast.totalIn, 50);
  assert.equal(forecast.totalOut, 20);
  assert.equal(forecast.closing, 200);
  assert.equal(forecast.rows.length, 2);
});

test("bookkeeping export keeps tax and costs in separate columns", () => {
  const data = fixture();
  data.expenses.push({
    id: "expense",
    date: "2026-11-21",
    amount: 25,
    category: "Rent",
    notes: "Shared kitchen",
  });
  const csv = bookkeepingCsv(data, "2026-11");
  assert.match(csv, /Sales or purchase tax/);
  assert.match(csv, /Cost of goods sold/);
  assert.match(csv, /recent-sale/);
  assert.match(csv, /Shared kitchen/);
});
