import { fullCost } from "./operations.js";
import { purchaseTax, saleRevenue } from "./taxation.js";
import { validDate } from "./business.js";

const number = (value, label, zero = false) => {
  const n = Number(value);
  if (!Number.isFinite(n) || (zero ? n < 0 : n <= 0))
    throw Error("Invalid " + label + ".");
  return n;
};

export function recipeSnapshot(data, recipeId) {
  const recipe = data.recipes.find((r) => r.id === recipeId);
  if (!recipe) throw Error("Recipe is missing.");
  return {
    capturedAt: new Date().toISOString(),
    recipe: structuredClone(recipe),
    items: recipe.lines.map((line) => {
      const item = data.items.find((i) => i.id === line.itemId);
      return item ? structuredClone(item) : null;
    }),
    batchCost: fullCost(recipe, data.items, data.settings),
    settings: structuredClone(data.settings),
  };
}

export function orderPaid(data, order) {
  const entries = (data.payments || []).filter((p) => p.orderId === order.id);
  if (!entries.length) return Number(order.paid) || 0;
  return entries.reduce(
    (sum, payment) =>
      sum + (payment.kind === "refund" ? -payment.amount : payment.amount),
    0,
  );
}

export function recordPayment(data, orderId, input) {
  const order = data.orders.find((o) => o.id === orderId);
  if (!order || order.status === "cancelled") throw Error("Order is unavailable.");
  const amount = number(input.amount, "payment amount");
  const kind = input.kind === "refund" ? "refund" : "payment";
  const current = orderPaid(data, order);
  const nextPaid = current + (kind === "refund" ? -amount : amount);
  if (nextPaid < -0.005) throw Error("Refund exceeds payments received.");
  if (nextPaid > order.total + 0.005) throw Error("Payment exceeds order total.");
  const payment = {
    id: crypto.randomUUID(),
    orderId,
    date: validDate(input.date),
    amount,
    kind,
    method: input.method || "Cash",
    note: input.note?.trim() || "",
  };
  return {
    ...data,
    payments: [...(data.payments || []), payment],
    orders: data.orders.map((o) =>
      o.id === orderId ? { ...o, paid: nextPaid } : o,
    ),
  };
}

export function calendarEntries(data, month) {
  const prefix = month + "-";
  return [
    ...data.orders
      .filter((o) => o.pickupDate?.startsWith(prefix))
      .map((o) => ({
        id: "order-" + o.id,
        date: o.pickupDate,
        type: "Pickup",
        title: o.customer || o.recipeName,
        detail: `${o.portions} portions · ${o.status}`,
      })),
    ...data.productionPlans
      .filter((p) => p.date?.startsWith(prefix))
      .map((p) => ({
        id: "plan-" + p.id,
        date: p.date,
        type: "Production",
        title:
          data.recipes.find((r) => r.id === p.recipeId)?.name ||
          p.recipeName ||
          "Recipe",
        detail: `${p.batches} batch(es) · ${p.status}`,
        planId: p.id,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

export function taxReport(data, month) {
  const sales = data.sales.filter((s) => s.date.startsWith(month));
  const purchases = (data.purchaseHistory || []).filter((p) =>
    p.date.startsWith(month),
  );
  return {
    month,
    netSales: sales.reduce((n, s) => n + saleRevenue(s), 0),
    customerTax: sales.reduce((n, s) => n + (s.tax || 0), 0),
    grossReceipts: sales.reduce((n, s) => n + s.total, 0),
    legacySales: sales.filter((s) => s.net == null).length,
    purchaseTax: purchases.reduce(
      (n, p) =>
        n +
        p.taxAmount != null
          ? p.taxAmount * (p.packages || 1)
          : Math.max(
              0,
              (p.finalPackageCost - p.packagePrice) * (p.packages || 1),
            ),
      0,
    ),
    taxableSales: sales
      .filter((s) => (s.taxRate || 0) > 0)
      .reduce((n, s) => n + (s.net || 0), 0),
    zeroTaxSales: sales
      .filter((s) => s.net != null && !(s.taxRate > 0))
      .reduce((n, s) => n + s.net, 0),
  };
}

export function wasteAnalysis(data, month) {
  const rows = data.waste.filter((w) => w.date.startsWith(month));
  const group = (field) =>
    Object.values(
      rows.reduce((map, row) => {
        const key = row[field] || "Waste";
        map[key] ??= { label: key, cost: 0, count: 0 };
        map[key].cost += row.cost;
        map[key].count += 1;
        return map;
      }, {}),
    ).sort((a, b) => b.cost - a.cost);
  return {
    rows,
    total: rows.reduce((n, row) => n + row.cost, 0),
    byReason: group("reason"),
    byItem: group("name"),
  };
}

export function ownerForecast(data, start, days = 7) {
  validDate(start);
  const endDate = new Date(start + "T12:00:00");
  endDate.setDate(endDate.getDate() + days - 1);
  const end = endDate.toLocaleDateString("en-CA");
  const orders = data.orders.filter(
    (o) => o.status === "open" && o.pickupDate >= start && o.pickupDate <= end,
  );
  const expectedRevenue = orders.reduce((n, o) => n + o.total, 0);
  const received = orders.reduce((n, o) => n + orderPaid(data, o), 0);
  const purchaseCash = data.items.reduce((sum, item) => {
    const missing = Math.max(
      0,
      (Number(item.minStock) || 0) - (item.stock || 0),
    );
    return (
      sum +
      Math.ceil(missing / item.amount - 1e-9) * purchaseTax(item).total
    );
  }, 0);
  const plannedCost = data.productionPlans
    .filter(
      (p) => p.status === "planned" && p.date >= start && p.date <= end,
    )
    .reduce((sum, p) => {
      if (p.recipeSnapshot?.batchCost != null)
        return sum + p.recipeSnapshot.batchCost * p.batches;
      const recipe = data.recipes.find((r) => r.id === p.recipeId);
      try {
        return sum + fullCost(recipe, data.items, data.settings) * p.batches;
      } catch {
        return sum;
      }
    }, 0);
  return {
    start,
    end,
    orders,
    expectedRevenue,
    received,
    outstanding: expectedRevenue - received,
    plannedCost,
    purchaseCash,
    projectedMargin: expectedRevenue - plannedCost - purchaseCash,
  };
}
