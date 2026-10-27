import { purchaseTax } from "./taxation.js";

const number = (value, label, allowZero = false) => {
  const n = Number(value);
  if (!Number.isFinite(n) || (allowZero ? n < 0 : n <= 0))
    throw Error("Invalid " + label + ".");
  return n;
};
const date = (value, label) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) throw Error("Invalid " + label + ".");
  const parsed = new Date(value + "T12:00:00");
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== Number(match[1]) ||
    parsed.getMonth() + 1 !== Number(match[2]) ||
    parsed.getDate() !== Number(match[3])
  )
    throw Error("Invalid " + label + ".");
  return value;
};

export function receiveInventory(data, itemId, input) {
  const item = data.items.find((i) => i.id === itemId);
  if (!item) throw Error("Inventory item is missing.");
  const packages = number(input.packages, "package count");
  const quantity = packages * item.amount;
  const packagePrice =
    input.packagePrice === "" || input.packagePrice == null
      ? item.price
      : number(input.packagePrice, "package price", true);
  const receivedAt = date(
    input.receivedAt || new Date().toLocaleDateString("en-CA"),
    "received date",
  );
  if (input.expiryDate) date(input.expiryDate, "expiry date");
  const lot = {
    id: crypto.randomUUID(),
    itemId,
    receivedAt,
    expiryDate: input.expiryDate || "",
    quantity,
    remaining: quantity,
    unit: item.unit,
    packages,
    packagePrice,
    taxMode: item.taxMode,
    taxIncluded: item.taxIncluded,
    tax: item.tax,
    supplier: input.supplier?.trim() || item.supplier || "",
  };
  const taxBreakdown = purchaseTax({ ...item, price: packagePrice });
  const finalPackageCost = taxBreakdown.total;
  return {
    ...data,
    items: data.items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            stock: (i.stock || 0) + quantity,
            price: packagePrice,
            supplier: lot.supplier,
          }
        : i,
    ),
    inventoryLots: [...(data.inventoryLots || []), lot],
    purchaseHistory: [
      ...(data.purchaseHistory || []),
      {
        id: crypto.randomUUID(),
        itemId,
        itemName: item.name,
        date: receivedAt,
        supplier: lot.supplier,
        packagePrice,
        finalPackageCost,
        taxAmount: taxBreakdown.tax,
        amount: item.amount,
        unit: item.unit,
        packages,
      },
    ],
    movements: [
      ...(data.movements || []),
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        name: item.name,
        kind: "Received",
        quantity,
        unit: item.unit,
        lotId: lot.id,
      },
    ],
  };
}

export function consumeLots(lots, itemId, quantity) {
  let left = number(quantity, "consumption quantity");
  const ordered = lots
    .filter((lot) => lot.itemId === itemId && lot.remaining > 0)
    .sort(
      (a, b) =>
        (a.expiryDate || "9999-12-31").localeCompare(
          b.expiryDate || "9999-12-31",
        ) || a.receivedAt.localeCompare(b.receivedAt),
    );
  const use = new Map();
  for (const lot of ordered) {
    const amount = Math.min(left, lot.remaining);
    if (amount > 0) use.set(lot.id, amount);
    left -= amount;
    if (left <= 1e-9) break;
  }
  return {
    lots: lots.map((lot) =>
      use.has(lot.id)
        ? { ...lot, remaining: Math.max(0, lot.remaining - use.get(lot.id)) }
        : lot,
    ),
    usage: [...use].map(([lotId, amount]) => ({ lotId, amount })),
  };
}

export function consumeManyLots(data, needs, batches = 1) {
  let lots = data.inventoryLots || [];
  const usage = [];
  for (const [itemId, perBatch] of Object.entries(needs)) {
    const result = consumeLots(lots, itemId, perBatch * batches);
    lots = result.lots;
    usage.push(...result.usage.map((row) => ({ ...row, itemId })));
  }
  return { lots, usage };
}

export function reconcileLots(lots, itemId, stock) {
  const tracked = lots
    .filter((lot) => lot.itemId === itemId)
    .reduce((sum, lot) => sum + (lot.remaining || 0), 0);
  if (tracked <= stock) return lots;
  return consumeLots(lots, itemId, tracked - stock).lots;
}

export function lotAlerts(data, day) {
  return (data.inventoryLots || [])
    .filter((lot) => lot.remaining > 0 && lot.expiryDate)
    .map((lot) => ({
      ...lot,
      item: data.items.find((item) => item.id === lot.itemId),
      expired: lot.expiryDate <= day,
    }))
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));
}
