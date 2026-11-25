import { saleRevenue } from "./taxation.js";

const list = (value) => (Array.isArray(value) ? value : []);
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
  const recipes = list(data.recipes).map((recipe) => {
    const saleFormat = recipe.saleFormat || "individual";
    const saleQuantity =
      saleFormat === "dozen"
        ? 12
        : Math.max(1, Number(recipe.saleQuantity) || 1);
    return {
      ...recipe,
      saleFormat,
      saleQuantity,
      salePrice: Number.isFinite(Number(recipe.salePrice))
        ? Number(recipe.salePrice)
        : (Number(recipe.price) || 0) * saleQuantity,
    };
  });
  return {
    ...data,
    recipes,
    sales: list(data.sales),
    expenses: list(data.expenses),
    salesTaxRate: data.salesTaxRate ?? 0,
    orders: list(data.orders),
    pickupSlots: list(data.pickupSlots),
    recipeTrials: list(data.recipeTrials),
    customers: list(data.customers),
    documentCounters: data.documentCounters || {},
    businessProfile: {
      supportEmail: "botaa109@gmail.com",
      ...(data.businessProfile || {}),
    },
    payments: list(data.payments),
    waste: list(data.waste),
    inventoryLots: list(data.inventoryLots),
    purchaseHistory: list(data.purchaseHistory),
    quotes: list(data.quotes),
    productionPlans: list(data.productionPlans),
    products: data.products || {},
    productLots: list(data.productLots),
    productionBatches: list(data.productionBatches),
    seasonalPlans: list(data.seasonalPlans),
    ownerTasks: list(data.ownerTasks),
    personalUseRecords: list(data.personalUseRecords),
    cashFlowPlans: list(data.cashFlowPlans),
    scalingPresets: list(data.scalingPresets),
    purchaseOrders: list(data.purchaseOrders),
    recipeVersions: list(data.recipeVersions),
    recipeComponents: list(data.recipeComponents),
    packagingPresets: list(data.packagingPresets),
    kitchenTimers: list(data.kitchenTimers),
    closeouts: list(data.closeouts),
    equipment: list(data.equipment),
    maintenanceLogs: list(data.maintenanceLogs),
    archives: list(data.archives),
    orderRequests: list(data.orderRequests),
    recurringTasks: list(data.recurringTasks),
    substitutions: list(data.substitutions),
    recipePhotos: list(data.recipePhotos),
    businessProfiles: list(data.businessProfiles),
    changeLog: list(data.changeLog),
    movements: list(data.movements),
    settings: { hourlyWage: 0, electricityRate: 0, ...(data.settings || {}) },
    taxRates: data.taxRates || { food: data.tax ?? 0, other: data.tax ?? 0 },
    items: list(data.items).map((i) => ({
      ...i,
      taxCategory: i.taxCategory || (i.type === "packaging" ? "other" : "food"),
    })),
  };
}
