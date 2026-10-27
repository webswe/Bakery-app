import { saleRevenue } from "./taxation.js";
export function monthlySummary(data, month) {
  const sales = data.sales.filter((s) => s.date.startsWith(month));
  const expenses = data.expenses.filter((e) => e.date.startsWith(month));
  const revenue = sales.reduce((n, s) => n + saleRevenue(s), 0),
    costs = sales.reduce((n, s) => n + s.cost, 0),
    overhead = expenses.reduce((n, e) => n + e.amount, 0);
  return {
    sales,
    expenses,
    revenue,
    costs,
    collectedTax: sales.reduce(
      (n, s) => n + (s.net != null ? s.tax || 0 : 0),
      0,
    ),
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
    salesTaxRate: data.salesTaxRate ?? 0,
    orders: data.orders || [],
    waste: data.waste || [],
    quotes: data.quotes || [],
    productionPlans: data.productionPlans || [],
    products: data.products || {},
    movements: data.movements || [],
    settings: data.settings || { hourlyWage: 0, electricityRate: 0 },
    taxRates: data.taxRates || { food: data.tax ?? 0, other: data.tax ?? 0 },
    items: data.items.map((i) => ({
      ...i,
      taxCategory: i.taxCategory || (i.type === "packaging" ? "other" : "food"),
    })),
  };
}
