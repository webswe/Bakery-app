import { fullCost } from "./operations.js";
import { recordPersonalUse } from "./inventoryLots.js";
import { adjustFinishedStock } from "./productLots.js";
import { purchaseTax, saleRevenue } from "./taxation.js";

const number = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const validDay = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return false;
  const date = new Date(value + "T12:00:00");
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() + 1 === Number(match[2]) &&
    date.getDate() === Number(match[3])
  );
};
const addDays = (value, amount) => {
  const date = new Date(value + "T12:00:00");
  date.setDate(date.getDate() + amount);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function productionRecommendations(data, day, horizonDays = 7) {
  if (!validDay(day)) throw Error("Choose a valid planning date.");
  const horizon = Math.max(
    1,
    Math.min(30, Math.round(number(horizonDays) || 7)),
  );
  const recentStart = addDays(day, -28);
  const through = addDays(day, horizon - 1);
  const recentSales = (data.sales || []).filter(
    (sale) => sale.date >= recentStart && sale.date < day,
  );
  const openOrders = (data.orders || []).filter(
    (order) =>
      !["cancelled", "completed", "fulfilled"].includes(order.status) &&
      order.pickupDate >= day &&
      order.pickupDate <= through,
  );
  const planned = (data.productionPlans || []).filter(
    (plan) =>
      plan.status === "planned" && plan.date >= day && plan.date <= through,
  );
  return (data.recipes || [])
    .map((recipe) => {
      const averageDaily =
        recentSales
          .filter((sale) => sale.recipeId === recipe.id)
          .reduce((sum, sale) => sum + number(sale.quantity), 0) / 28;
      const orderDemand = openOrders
        .filter((order) => order.recipeId === recipe.id)
        .reduce(
          (sum, order) =>
            sum +
            Math.max(
              0,
              number(
                order.portions ??
                  order.quantity ??
                  order.snapshot?.portions ??
                  order.producedPortions,
              ),
            ),
          0,
        );
      const scheduled = planned
        .filter((plan) => plan.recipeId === recipe.id)
        .reduce(
          (sum, plan) =>
            sum + Math.max(0, number(plan.batches)) * number(recipe.yield),
          0,
        );
      const onHand = Math.max(0, number(data.products?.[recipe.id]?.quantity));
      const forecastDemand = Math.ceil(averageDaily * horizon + orderDemand);
      const portionsToMake = Math.max(0, forecastDemand - onHand - scheduled);
      const batches = Math.ceil(
        portionsToMake / Math.max(1, number(recipe.yield)),
      );
      let batchCost = 0;
      try {
        batchCost = fullCost(recipe, data.items || [], data.settings || {});
      } catch {
        batchCost = 0;
      }
      return {
        recipeId: recipe.id,
        name: recipe.name,
        horizon,
        averageDaily,
        orderDemand,
        forecastDemand,
        onHand,
        scheduled,
        portionsToMake,
        batches,
        estimatedCost: batches * batchCost,
        reason:
          orderDemand > 0
            ? `${orderDemand} portion(s) committed to upcoming orders`
            : averageDaily > 0
              ? `${averageDaily.toFixed(1)} portion(s) sold per day recently`
              : "No recent demand recorded",
      };
    })
    .filter((row) => row.forecastDemand > 0 || row.onHand > 0)
    .sort(
      (a, b) =>
        b.batches - a.batches ||
        b.orderDemand - a.orderDemand ||
        b.averageDaily - a.averageDaily,
    );
}

export function recordOwnerUse(data, input) {
  const kind = input.kind === "dessert" ? "dessert" : "ingredient";
  const quantity = number(input.quantity);
  if (!(quantity > 0)) throw Error("Enter a positive quantity.");
  if (!validDay(input.date)) throw Error("Choose a valid date.");
  const note = String(input.note || "").trim();
  let next;
  let name;
  let unit;
  let cost;
  if (kind === "dessert") {
    const recipe = (data.recipes || []).find(
      (row) => row.id === input.recordId,
    );
    if (!recipe) throw Error("Choose a dessert.");
    const stock = data.products?.[recipe.id] || { quantity: 0, value: 0 };
    cost = stock.quantity ? (stock.value / stock.quantity) * quantity : 0;
    next = adjustFinishedStock(data, recipe.id, {
      direction: "remove",
      quantity,
      date: input.date,
      reason: "Personal use",
      note,
    });
    name = recipe.name;
    unit = "portions";
  } else {
    const item = (data.items || []).find((row) => row.id === input.recordId);
    if (!item) throw Error("Choose an ingredient or package.");
    if (item.needsPrice)
      throw Error("Set the purchase price before recording personal use.");
    cost = item.amount
      ? (purchaseTax(item).total / number(item.amount)) * quantity
      : 0;
    next = recordPersonalUse(data, item.id, quantity, {
      date: input.date,
      note,
    });
    name = item.name;
    unit = item.unit;
  }
  return {
    ...next,
    personalUseRecords: [
      ...(next.personalUseRecords || []),
      {
        id: crypto.randomUUID(),
        date: input.date,
        kind,
        recordId: input.recordId,
        name,
        quantity,
        unit,
        cost,
        note,
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

export function saveCashPlan(data, input, id = "") {
  if (!validDay(input.date)) throw Error("Choose a valid date.");
  const amount = number(input.amount);
  if (!(amount > 0)) throw Error("Enter a positive amount.");
  const name = String(input.name || "").trim();
  if (!name) throw Error("Enter a cash-flow description.");
  const event = {
    id: id || crypto.randomUUID(),
    date: input.date,
    name,
    amount,
    direction: input.direction === "in" ? "in" : "out",
    category: String(input.category || "Planned").trim() || "Planned",
    createdAt:
      (data.cashFlowPlans || []).find((row) => row.id === id)?.createdAt ||
      new Date().toISOString(),
  };
  return {
    ...data,
    cashFlowPlans: [
      ...(data.cashFlowPlans || []).filter((row) => row.id !== event.id),
      event,
    ],
  };
}

export function removeCashPlan(data, id) {
  return {
    ...data,
    cashFlowPlans: (data.cashFlowPlans || []).filter((row) => row.id !== id),
  };
}

function recordedCashEvents(data, start, end) {
  const events = [];
  const within = (date) => date >= start && date <= end;
  (data.payments || [])
    .filter((payment) => within(payment.date))
    .forEach((payment) => {
      if (payment.kind === "adjustment") return;
      events.push({
        id: `payment-${payment.id}`,
        date: payment.date,
        name:
          payment.note ||
          (payment.kind === "refund" ? "Customer refund" : "Customer payment"),
        amount: number(payment.amount),
        direction: payment.kind === "refund" ? "out" : "in",
        category: payment.kind === "refund" ? "Refund" : "Payment received",
        source: "recorded",
      });
    });
  (data.sales || [])
    .filter(
      (sale) =>
        within(sale.date) &&
        !sale.orderId &&
        sale.paymentStatus !== "unpaid" &&
        sale.paymentStatus !== "partial" &&
        !(data.payments || []).some((payment) => payment.saleId === sale.id),
    )
    .forEach((sale) =>
      events.push({
        id: `paid-sale-${sale.id}`,
        date: sale.date,
        name: sale.customer || sale.name || "Paid sale",
        amount: number(sale.total),
        direction: "in",
        category: "Paid sale",
        source: "recorded",
      }),
    );
  (data.expenses || [])
    .filter((expense) => within(expense.date))
    .forEach((expense) =>
      events.push({
        id: `expense-${expense.id}`,
        date: expense.date,
        name: expense.name || expense.category || "Expense",
        amount: number(expense.amount),
        direction: "out",
        category: expense.category || "Expense",
        source: "recorded",
      }),
    );
  (data.purchaseHistory || [])
    .filter((purchase) => within(purchase.date))
    .forEach((purchase) =>
      events.push({
        id: `purchase-${purchase.id}`,
        date: purchase.date,
        name: purchase.itemName || "Inventory purchase",
        amount:
          number(purchase.finalPackageCost ?? purchase.packagePrice) *
          Math.max(1, number(purchase.packages) || 1),
        direction: "out",
        category: "Inventory purchase",
        source: "recorded",
      }),
    );
  return events.filter((event) => event.amount > 0);
}

function openingCashOn(data, start) {
  const month = start.slice(0, 7);
  const monthStart = month + "-01";
  const finance = data.settings?.finance || {};
  let cash = number(
    finance.openingCashByMonth?.[month] ?? finance.openingCash,
  );
  for (const event of recordedCashEvents(data, monthStart, addDays(start, -1)))
    cash += event.direction === "in" ? event.amount : -event.amount;
  return cash;
}

export function cashFlowForecast(data, start, days = 30) {
  if (!validDay(start)) throw Error("Choose a valid forecast date.");
  const length = Math.max(1, Math.min(90, Math.round(number(days) || 30)));
  const end = addDays(start, length - 1);
  const opening = openingCashOn(data, start);
  const payments = data.payments || [];
  const paidFor = (field, id) =>
    payments
      .filter((payment) => payment[field] === id)
      .reduce(
        (sum, payment) =>
          sum +
          (payment.kind === "refund"
            ? -number(payment.amount)
            : number(payment.amount)),
        0,
      );
  const events = recordedCashEvents(data, start, end);
  (data.orders || [])
    .filter(
      (order) =>
        !["cancelled", "completed", "fulfilled"].includes(order.status) &&
        order.pickupDate >= start &&
        order.pickupDate <= end,
    )
    .forEach((order) => {
      const total = number(
        order.total ?? order.snapshot?.total ?? order.quoteSnapshot?.total,
      );
      const amount = Math.max(0, total - paidFor("orderId", order.id));
      if (amount)
        events.push({
          id: `order-${order.id}`,
          date: order.pickupDate,
          name: order.customer || order.recipeName || "Customer order",
          amount,
          direction: "in",
          category: "Order balance",
          source: "recorded",
        });
    });
  (data.sales || [])
    .filter(
      (sale) =>
        ["unpaid", "partial"].includes(sale.paymentStatus) &&
        (sale.dueDate || sale.date) >= start &&
        (sale.dueDate || sale.date) <= end,
    )
    .forEach((sale) => {
      const amount = Math.max(
        0,
        number(sale.total) - paidFor("saleId", sale.id),
      );
      if (amount)
        events.push({
          id: `sale-${sale.id}`,
          date: sale.dueDate || sale.date,
          name: sale.customer || sale.name || "Unpaid sale",
          amount,
          direction: "in",
          category: "Receivable",
          source: "recorded",
        });
    });
  (data.cashFlowPlans || [])
    .filter((event) => event.date >= start && event.date <= end)
    .forEach((event) => events.push({ ...event, source: "planned" }));
  const grouped = {};
  events.forEach((event) => {
    const row = (grouped[event.date] ||= {
      date: event.date,
      cashIn: 0,
      cashOut: 0,
      events: [],
    });
    if (event.direction === "in") row.cashIn += number(event.amount);
    else row.cashOut += number(event.amount);
    row.events.push(event);
  });
  let runningCash = opening;
  const rows = Object.values(grouped)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => {
      runningCash += row.cashIn - row.cashOut;
      return { ...row, runningCash };
    });
  return {
    start,
    end,
    opening,
    rows,
    closing: runningCash,
    lowestCash: rows.length
      ? Math.min(opening, ...rows.map((row) => row.runningCash))
      : opening,
    totalIn: events
      .filter((event) => event.direction === "in")
      .reduce((sum, event) => sum + number(event.amount), 0),
    totalOut: events
      .filter((event) => event.direction === "out")
      .reduce((sum, event) => sum + number(event.amount), 0),
  };
}

export function bookkeepingLedger(data, month) {
  if (!/^\d{4}-\d{2}$/.test(month || ""))
    throw Error("Choose a valid bookkeeping month.");
  const rows = [];
  (data.sales || [])
    .filter((sale) => sale.date?.startsWith(month))
    .forEach((sale) =>
      rows.push({
        date: sale.date,
        type: "Sale",
        reference: sale.id,
        category: sale.orderType || "Sales",
        moneyIn: saleRevenue(sale),
        moneyOut: 0,
        tax: number(sale.tax),
        cost: number(sale.cost),
        notes: sale.customer || sale.name || "",
      }),
    );
  (data.expenses || [])
    .filter((expense) => expense.date?.startsWith(month))
    .forEach((expense) =>
      rows.push({
        date: expense.date,
        type: "Expense",
        reference: expense.id,
        category: expense.category || "Other",
        moneyIn: 0,
        moneyOut: number(expense.amount),
        tax: number(expense.tax),
        cost: 0,
        notes: expense.vendor || expense.notes || "",
      }),
    );
  (data.purchaseHistory || [])
    .filter((purchase) => purchase.date?.startsWith(month))
    .forEach((purchase) =>
      rows.push({
        date: purchase.date,
        type: "Inventory purchase",
        reference: purchase.id,
        category: purchase.itemName || "Inventory",
        moneyIn: 0,
        moneyOut:
          number(purchase.finalPackageCost ?? purchase.packagePrice) *
          Math.max(1, number(purchase.packages) || 1),
        tax: number(purchase.taxAmount),
        cost: 0,
        notes: purchase.supplier || "",
      }),
    );
  return rows.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.type.localeCompare(b.type) ||
      String(a.reference).localeCompare(String(b.reference)),
  );
}

export function bookkeepingCsv(data, month) {
  const rows = bookkeepingLedger(data, month);
  const header = [
    "Date",
    "Type",
    "Reference",
    "Category",
    "Money in",
    "Money out",
    "Sales or purchase tax",
    "Cost of goods sold",
    "Notes",
  ];
  return [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.date,
        row.type,
        row.reference,
        row.category,
        row.moneyIn.toFixed(2),
        row.moneyOut.toFixed(2),
        row.tax.toFixed(2),
        row.cost.toFixed(2),
        row.notes,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
}
