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
  const recipes = (data.recipes || []).map((recipe) => {
    const saleFormat = recipe.saleFormat || "individual";
    const saleQuantity = saleFormat === "dozen" ? 12 : Math.max(1, Number(recipe.saleQuantity) || 1);
    return { ...recipe, saleFormat, saleQuantity, salePrice: Number.isFinite(Number(recipe.salePrice)) ? Number(recipe.salePrice) : (Number(recipe.price) || 0) * saleQuantity };
  });
  return {
    ...data,
    recipes,
    salesTaxRate: data.salesTaxRate ?? 0,
    orders: data.orders || [],
    customers: data.customers || [],
    documentCounters: data.documentCounters || {},
    businessProfile: data.businessProfile || {},
    payments: data.payments || [],
    waste: data.waste || [],
    inventoryLots: data.inventoryLots || [],
    purchaseHistory: data.purchaseHistory || [],
    quotes: data.quotes || [],
    productionPlans: data.productionPlans || [],
    products: data.products || {},
    productLots: data.productLots || [],
    productionBatches: data.productionBatches || [],
    seasonalPlans: data.seasonalPlans || [],
    ownerTasks: data.ownerTasks || [],
    scalingPresets: data.scalingPresets || [],
    purchaseOrders: data.purchaseOrders || [],
    recipeVersions: data.recipeVersions || [],
    recipeComponents: data.recipeComponents || [],
    packagingPresets: data.packagingPresets || [],
    kitchenTimers: data.kitchenTimers || [],
    closeouts: data.closeouts || [],
    equipment: data.equipment || [],
    maintenanceLogs: data.maintenanceLogs || [],
    archives: data.archives || [],
    movements: data.movements || [],
    settings: { hourlyWage: 0, electricityRate: 0, ...(data.settings || {}) },
    taxRates: data.taxRates || { food: data.tax ?? 0, other: data.tax ?? 0 },
    items: data.items.map((i) => ({
      ...i,
      taxCategory: i.taxCategory || (i.type === "packaging" ? "other" : "food"),
    })),
  };
}
