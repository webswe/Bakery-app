export function monthlySummary(data, month) {
  const sales = data.sales.filter((s) => s.date.startsWith(month));
  const expenses = data.expenses.filter((e) => e.date.startsWith(month));
  const revenue = sales.reduce((n, s) => n + s.total, 0),
    costs = sales.reduce((n, s) => n + s.cost, 0),
    overhead = expenses.reduce((n, e) => n + e.amount, 0);
  return {
    sales,
    expenses,
    revenue,
    costs,
    overhead,
    profit: revenue - costs - overhead,
    orders: sales.length,
    portions: sales.reduce((n, s) => n + s.quantity, 0),
  };
}
export function previousMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
}
export function migrateData(data) {
  return {
    ...data,
    taxRates: data.taxRates || { food: data.tax ?? 0, other: data.tax ?? 0 },
    items: data.items.map((i) => ({
      ...i,
      taxCategory: i.taxCategory || (i.type === "packaging" ? "other" : "food"),
    })),
  };
}
