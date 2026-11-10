const emptyArrayFields = (fields) =>
  Object.fromEntries(fields.map((key) => [key, []]));

export const cleanupGroups = [
  {
    id: "inventory",
    title: "Inventory & purchasing",
    description:
      "Ingredients, packaging, stock lots, purchase history and stock movements.",
    fields: ["items", "inventoryLots", "purchaseHistory", "movements"],
  },
  {
    id: "recipes",
    title: "Recipes & finished stock",
    description:
      "Recipes, recipe details, finished stock, production batches and kitchen scaling tools.",
    fields: [
      "recipes",
      "products",
      "productLots",
      "productionBatches",
      "recipeVersions",
      "recipeComponents",
      "recipePhotos",
      "packagingPresets",
      "scalingPresets",
      "substitutions",
    ],
  },
  {
    id: "sales",
    title: "Sales, customers & orders",
    description:
      "Direct sales, quotes, customer records, orders, payments and document numbering.",
    fields: [
      "sales",
      "orders",
      "quotes",
      "payments",
      "customers",
      "orderRequests",
      "documentCounters",
    ],
  },
  {
    id: "operations",
    title: "Planning, finance & activity",
    description:
      "Expenses, waste, plans, tasks, purchase orders, equipment, archive and activity history.",
    fields: [
      "expenses",
      "waste",
      "productionPlans",
      "seasonalPlans",
      "ownerTasks",
      "recurringTasks",
      "purchaseOrders",
      "closeouts",
      "equipment",
      "maintenanceLogs",
      "archives",
      "kitchenTimers",
      "changeLog",
    ],
  },
  {
    id: "preferences",
    title: "Bakery profile & preferences",
    description:
      "Business identity, saved profiles, appearance, costs and tax defaults.",
    fields: [
      "businessProfile",
      "businessProfiles",
      "settings",
      "taxRates",
      "tax",
      "salesTaxRate",
    ],
  },
];

export function cleanupCount(data, group) {
  return group.fields.reduce((total, field) => {
    const value = data[field];
    if (Array.isArray(value)) return total + value.length;
    if (value && typeof value === "object")
      return total + Object.keys(value).length;
    return total + (value == null || value === 0 ? 0 : 1);
  }, 0);
}

export function clearSelectedData(data, selectedIds) {
  const selected = new Set(selectedIds);
  const fields = cleanupGroups
    .filter((group) => selected.has(group.id))
    .flatMap((group) => group.fields);
  const next = { ...data, ...emptyArrayFields(fields) };
  if (fields.includes("products")) next.products = {};
  if (fields.includes("documentCounters")) next.documentCounters = {};
  if (fields.includes("businessProfile")) {
    next.businessProfile = { supportEmail: "botaa109@gmail.com" };
  }
  if (fields.includes("settings")) {
    next.settings = { hourlyWage: 0, electricityRate: 0 };
  }
  if (fields.includes("taxRates")) next.taxRates = { food: 0, other: 0 };
  if (fields.includes("tax")) next.tax = 0;
  if (fields.includes("salesTaxRate")) next.salesTaxRate = 0;
  return next;
}
