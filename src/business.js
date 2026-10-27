import { purchaseTax } from "./taxation.js";
import { inventoryForecast, savePlan, localDate } from "./planning.js";
import { sell, fullCost } from "./operations.js";
export const checklistSteps = ["Bake", "Chill", "Decorate", "Pack"];
const positive = (v, label, zero = false) => {
  const n = Number(v);
  if (v === "" || !Number.isFinite(n) || (zero ? n < 0 : n <= 0))
    throw Error("Invalid " + label);
  return n;
};
export function validDate(value) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value || "") ||
    new Date(value + "T12:00:00").toLocaleDateString("en-CA") !== value
  )
    throw Error("Choose a valid date.");
  return value;
}
export function createOrder(data, input) {
  const quote = data.quotes.find((q) => q.id === input.quoteId);
  if (!quote) throw Error("Choose a saved quote.");
  if (!data.recipes.some((r) => r.id === quote.recipeId))
    throw Error("The quoted recipe is missing.");
  const total = positive(quote.snapshot.total, "quote total", true),
    paid = positive(input.deposit, "deposit", true);
  if (paid > total) throw Error("Deposit exceeds order total.");
  const recipe = data.recipes.find((r) => r.id === quote.recipeId);
  const batches = Math.ceil(quote.snapshot.portions / recipe.yield);
  if (!Number.isInteger(batches) || batches < 1)
    throw Error("Invalid recipe yield or quote portions.");
  const id = crypto.randomUUID();
  const next = savePlan(data, {
    recipeId: quote.recipeId,
    date: validDate(input.pickupDate),
    batches,
    notes: quote.customer + ": " + (quote.notes || ""),
    orderId: id,
  });
  return {
    ...next,
    orders: [
      ...data.orders,
      {
        id,
        quoteId: quote.id,
        recipeId: quote.recipeId,
        recipeName: quote.snapshot.recipeName,
        customer: quote.customer,
        notes: quote.notes,
        portions: quote.snapshot.portions,
        total,
        ...(Number.isFinite(quote.snapshot.subtotal) &&
        Number.isFinite(quote.snapshot.tax)
          ? {
              taxSnapshot: {
                net: quote.snapshot.subtotal,
                tax: quote.snapshot.tax,
                taxRate: Number(quote.snapshot.taxRate ?? quote.taxRate ?? 0),
              },
            }
          : {}),
        paid,
        pickupDate: input.pickupDate,
        status: "open",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}
export function updateOrder(data, id, action, input = {}) {
  const o = data.orders.find((o) => o.id === id);
  if (!o || o.status !== "open") throw Error("This order is no longer open.");
  let next = data,
    patch = {};
  if (action === "payment") {
    const paid = positive(input.paid, "total paid", true);
    if (paid > o.total) throw Error("Payment exceeds order total.");
    patch = { paid };
  } else if (action === "reschedule") {
    const pickupDate = validDate(input.pickupDate);
    patch = { pickupDate };
    next = {
      ...data,
      productionPlans: data.productionPlans.map((p) =>
        p.orderId === id && p.status === "planned"
          ? { ...p, date: pickupDate }
          : p,
      ),
    };
  } else if (action === "cancel") {
    patch = { status: "cancelled" };
    next = {
      ...data,
      productionPlans: data.productionPlans.filter(
        (p) => p.orderId !== id || p.status === "completed",
      ),
    };
  } else if (action === "fulfill") {
    if (o.paid < o.total - 0.005)
      throw Error("Record the full payment before fulfillment.");
    next = sell(data, {
      recipe: o.recipeId,
      quantity: o.portions,
      total: o.total,
      taxSnapshot: o.taxSnapshot,
      date: localDate(),
      customer: o.customer,
      payment: "Order payments",
    });
    const sale = next.sales.at(-1);
    next = {
      ...next,
      sales: next.sales.map((s) =>
        s.id === sale.id ? { ...s, orderId: id } : s,
      ),
      productionPlans: next.productionPlans.filter(
        (p) => p.orderId !== id || p.status === "completed",
      ),
    };
    patch = {
      status: "fulfilled",
      saleId: sale.id,
      fulfilledAt: new Date().toISOString(),
    };
  } else throw Error("Unknown order action");
  return {
    ...next,
    orders: next.orders.map((x) => (x.id === id ? { ...x, ...patch } : x)),
  };
}
export function shoppingList(data, through) {
  const f = inventoryForecast(data, through);
  const rows = f.items
    .map((i) => {
      const minimum = Number(i.minStock) || 0;
      const needed = Math.max(0, i.needed + minimum - i.stock);
      const packages = Math.max(0, Math.ceil(needed / i.amount - 1e-9));
      return {
        ...i,
        packages,
        buyQuantity: packages * i.amount,
        estimate: i.needsPrice ? null : packages * purchaseTax(i).total,
        supplier: i.supplier?.trim() || "Unassigned supplier",
      };
    })
    .filter((i) => i.packages > 0);
  return { ...f, rows };
}
export function stockAlerts(data, day = localDate()) {
  return data.items.filter(
    (i) =>
      (i.stock || 0) <= (i.minStock || 0) ||
      ((i.stock || 0) > 0 && i.expiryDate && i.expiryDate <= day),
  );
}
export function recordWaste(data, input) {
  const amount = positive(input.amount, "waste quantity"),
    date = validDate(input.date);
  let cost,
    name,
    next = data,
    unit;
  if (input.kind === "ingredient") {
    const item = data.items.find((i) => i.id === input.itemId);
    if (!item) throw Error("Choose an inventory item.");
    if (amount > (item.stock || 0)) throw Error("Waste exceeds stock.");
    if (item.needsPrice)
      throw Error("Set the purchase price before recording waste.");
    cost = (amount / item.amount) * purchaseTax(item).total;
    name = item.name;
    unit = item.unit;
    next = {
      ...data,
      items: data.items.map((i) =>
        i.id === item.id ? { ...i, stock: i.stock - amount } : i,
      ),
    };
  } else if (input.kind === "product") {
    const r = data.recipes.find((r) => r.id === input.itemId),
      stock = data.products[input.itemId];
    if (!r || !stock || amount > stock.quantity || !Number.isInteger(amount))
      throw Error("Enter available whole dessert portions.");
    cost = (stock.value / stock.quantity) * amount;
    name = r.name;
    unit = "portions";
    next = {
      ...data,
      products: {
        ...data.products,
        [r.id]: {
          quantity: stock.quantity - amount,
          value: Math.max(0, stock.value - cost),
        },
      },
    };
  } else throw Error("Choose a waste type.");
  if (!Number.isFinite(cost) || cost < 0) throw Error("Invalid stock cost.");
  const id = crypto.randomUUID(),
    entry = {
      id,
      date,
      name,
      amount,
      unit,
      cost,
      reason: input.reason || "Waste",
      kind: input.kind,
    };
  return {
    ...next,
    waste: [...data.waste, entry],
    expenses: [
      ...data.expenses,
      { id, date, name: "Waste: " + name, amount: cost, wasteId: id },
    ],
    movements: [
      ...data.movements,
      { id, date, name, quantity: -amount, unit, kind: "Waste" },
    ],
  };
}
export function scaleRecipe(data, id, target) {
  const r = data.recipes.find((r) => r.id === id),
    portions = positive(target, "target portions");
  if (!r || !(r.yield > 0) || !Number.isInteger(portions))
    throw Error("Choose a recipe and whole portions.");
  const factor = portions / r.yield;
  return {
    ...r,
    yield: portions,
    factor,
    lines: r.lines.map((l) => ({ ...l, amount: l.amount * factor })),
    laborMinutes: (r.laborMinutes || 0) * factor,
    electricityKwh: (r.electricityKwh || 0) * factor,
    overheadPerBatch: (r.overheadPerBatch || 0) * factor,
    cost: fullCost(r, data.items, data.settings) * factor,
  };
}
export function toggleChecklist(data, id, step) {
  if (!checklistSteps.includes(step)) throw Error("Unknown checklist step.");
  const p = data.productionPlans.find((p) => p.id === id);
  if (!p || p.status !== "planned")
    throw Error("Only pending tasks can change.");
  return {
    ...data,
    productionPlans: data.productionPlans.map((p) =>
      p.id === id
        ? { ...p, checklist: { ...p.checklist, [step]: !p.checklist?.[step] } }
        : p,
    ),
  };
}
