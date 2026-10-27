export const moneyRound = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function taxRate(value) {
  const n = Number(value);
  if (value === "" || value == null || !Number.isFinite(n) || n < 0 || n > 100)
    throw Error("Tax rate must be between 0 and 100%.");
  return n;
}
export function purchaseMode(item) {
  return item.taxMode || (item.taxIncluded ? "legacy" : "added");
}
export function purchaseTax(item) {
  const mode = purchaseMode(item),
    price = Number(item.price),
    rate = taxRate(item.tax ?? 0);
  if (
    !["added", "included", "exempt", "legacy"].includes(mode) ||
    !Number.isFinite(price) ||
    price < 0
  )
    throw Error("Invalid purchase price or tax treatment.");
  // Keep proportional inventory costing unrounded, preserving historical behavior.
  const total = mode === "added" ? price * (1 + rate / 100) : price;
  const base = mode === "included" ? price / (1 + rate / 100) : price;
  return {
    mode,
    rate,
    base,
    tax:
      mode === "added" ? total - price : mode === "included" ? price - base : 0,
    total,
  };
}
export function customerTax(net, rate) {
  const n = Number(net),
    r = taxRate(rate);
  if (!Number.isFinite(n) || n < 0) throw Error("Invalid sale subtotal.");
  const beforeTax = moneyRound(n),
    tax = moneyRound((beforeTax * r) / 100);
  return {
    net: beforeTax,
    tax,
    taxRate: r,
    total: moneyRound(beforeTax + tax),
  };
}
export function directSaleTotals(price, quantity, discount, rate) {
  const p = Number(price),
    q = Number(quantity),
    d = Number(discount);
  if (
    !Number.isFinite(p) ||
    p < 0 ||
    !Number.isInteger(q) ||
    q < 1 ||
    !Number.isFinite(d) ||
    d < 0
  )
    throw Error("Enter valid sale quantities and discount.");
  const subtotal = moneyRound(p * q);
  if (d > subtotal) throw Error("Discount exceeds the sale subtotal.");
  return {
    subtotal,
    discount: moneyRound(d),
    ...customerTax(subtotal - moneyRound(d), rate),
  };
}
export const saleRevenue = (sale) => sale.net ?? sale.total;
