import { recipeCostDetails } from "./recipePricing.js";
import { localDay } from "./dateUtils.js";

export const commonAllergens = [
  "Milk",
  "Eggs",
  "Wheat",
  "Peanuts",
  "Tree nuts",
  "Soy",
  "Sesame",
];

export function saveRecipeRevision(data, previous, next) {
  if (!previous) return data;
  const comparable = (value) =>
    JSON.stringify({ ...value, updatedAt: undefined });
  if (comparable(previous) === comparable(next)) return data;
  const revision = {
    id: crypto.randomUUID(),
    recipeId: previous.id,
    savedAt: new Date().toISOString(),
    recipe: structuredClone(previous),
  };
  const revisions = [...(data.recipeVersions || []), revision];
  const recipeRevisions = revisions
    .filter((entry) => entry.recipeId === previous.id)
    .slice(-25);
  return {
    ...data,
    recipeVersions: [
      ...revisions.filter((entry) => entry.recipeId !== previous.id),
      ...recipeRevisions,
    ],
  };
}

export function restoreRecipeRevision(data, revisionId) {
  const revision = (data.recipeVersions || []).find(
    (entry) => entry.id === revisionId,
  );
  if (!revision) throw Error("Recipe revision is missing.");
  const current = data.recipes.find(
    (recipe) => recipe.id === revision.recipeId,
  );
  const withHistory = saveRecipeRevision(data, current, revision.recipe);
  return {
    ...withHistory,
    recipes: data.recipes.map((recipe) =>
      recipe.id === revision.recipeId
        ? structuredClone(revision.recipe)
        : recipe,
    ),
  };
}

export function recipeRemovalStatus(data, recipeId) {
  const recipe = (data.recipes || []).find((entry) => entry.id === recipeId);
  if (!recipe) throw Error("Recipe is missing.");
  const planned = (data.productionPlans || []).filter(
    (plan) => plan.recipeId === recipeId && plan.status === "planned",
  ).length;
  const openOrders = (data.orders || []).filter(
    (order) => order.recipeId === recipeId && order.status === "open",
  ).length;
  const savedQuotes = (data.quotes || []).filter(
    (quote) => quote.recipeId === recipeId,
  ).length;
  const stock = Number(data.products?.[recipeId]?.quantity) || 0;
  const lotStock = (data.productLots || [])
    .filter((lot) => lot.recipeId === recipeId)
    .reduce((total, lot) => total + (Number(lot.remaining) || 0), 0);
  const blockers = [
    planned && `${planned} planned production task${planned === 1 ? "" : "s"}`,
    openOrders && `${openOrders} open order${openOrders === 1 ? "" : "s"}`,
    savedQuotes && `${savedQuotes} saved quote${savedQuotes === 1 ? "" : "s"}`,
    stock > 0 || lotStock > 0 ? "finished stock on hand" : "",
  ].filter(Boolean);
  return { recipe, blockers };
}

export function removeRecipe(data, recipeId) {
  const { recipe, blockers } = recipeRemovalStatus(data, recipeId);
  if (blockers.length)
    throw Error(
      `Resolve ${blockers.join(", ")} before removing ${recipe.name}.`,
    );
  const products = { ...(data.products || {}) };
  delete products[recipeId];
  return {
    ...data,
    products,
    recipes: (data.recipes || []).filter((entry) => entry.id !== recipeId),
    recipeVersions: (data.recipeVersions || []).filter(
      (entry) => entry.recipeId !== recipeId,
    ),
  };
}

export function saveRecipePreset(data, kind, input) {
  if (!["component", "packaging"].includes(kind))
    throw Error("Unknown preset type.");
  const name = input.name?.trim();
  if (!name) throw Error("Enter a preset name.");
  if (!input.lines?.length) throw Error("Add at least one item to the preset.");
  const key = kind === "component" ? "recipeComponents" : "packagingPresets";
  const preset = {
    id: input.id || crypto.randomUUID(),
    name,
    notes: input.notes?.trim() || "",
    lines: structuredClone(input.lines),
  };
  return {
    ...data,
    [key]: [
      ...(data[key] || []).filter((entry) => entry.id !== preset.id),
      preset,
    ],
  };
}

export function menuProfitability(data) {
  return (data.recipes || [])
    .map((recipe) => {
      const economics = recipeCostDetails(recipe, data.items, data.settings);
      const sales = (data.sales || []).filter(
        (sale) => sale.recipeId === recipe.id,
      );
      const sold = sales.reduce(
        (sum, sale) => sum + (Number(sale.quantity) || 0),
        0,
      );
      const revenue = sales.reduce(
        (sum, sale) => sum + Number(sale.net ?? sale.total ?? 0),
        0,
      );
      const cost = sold * economics.perPortion;
      const minutes = Math.max(1, Number(recipe.laborMinutes) || 0);
      return {
        recipe,
        sold,
        revenue,
        cost,
        profit: revenue - cost,
        margin: revenue ? ((revenue - cost) / revenue) * 100 : economics.margin,
        profitPerLaborHour: (economics.profit / minutes) * 60,
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

export function capacityForecast(data, startDate, days = 7) {
  const capacity = {
    prep: 480,
    oven: 360,
    decorating: 300,
    packing: 240,
    ...(data.settings?.capacity || {}),
  };
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(`${startDate}T12:00:00`);
    date.setDate(date.getDate() + offset);
    const day = localDay(date);
    const plans = (data.productionPlans || []).filter(
      (plan) => plan.date === day && plan.status !== "completed",
    );
    const load = plans.reduce(
      (total, plan) => {
        const recipe =
          plan.recipeSnapshot ||
          data.recipes.find((entry) => entry.id === plan.recipeId) ||
          {};
        const batches = Number(plan.batches) || 0;
        total.prep +=
          (Number(recipe.prepMinutes) || Number(recipe.laborMinutes) || 0) *
          batches;
        total.oven += (Number(recipe.bakeMinutes) || 0) * batches;
        total.decorating +=
          Math.max(
            0,
            (Number(recipe.laborMinutes) || 0) -
              (Number(recipe.prepMinutes) || 0),
          ) * batches;
        total.packing += 5 * batches;
        return total;
      },
      { prep: 0, oven: 0, decorating: 0, packing: 0 },
    );
    return {
      date: day,
      plans,
      load,
      capacity,
      peak: Math.max(
        ...Object.keys(load).map((key) =>
          capacity[key] ? (load[key] / capacity[key]) * 100 : 0,
        ),
      ),
    };
  });
}

export function saveCloseout(data, closeout) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closeout.date || ""))
    throw Error("Choose a closeout date.");
  const value = {
    ...closeout,
    id: closeout.id || crypto.randomUUID(),
    savedAt: new Date().toISOString(),
  };
  return {
    ...data,
    closeouts: [
      ...(data.closeouts || []).filter((entry) => entry.date !== value.date),
      value,
    ],
  };
}

export function saveEquipment(data, input) {
  const name = input.name?.trim();
  if (!name) throw Error("Enter an equipment name.");
  const equipment = { ...input, id: input.id || crypto.randomUUID(), name };
  return {
    ...data,
    equipment: [
      ...(data.equipment || []).filter((entry) => entry.id !== equipment.id),
      equipment,
    ],
  };
}

export function archiveCompletedRecords(data, beforeDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeDate || ""))
    throw Error("Choose an archive date.");
  const orders = (data.orders || []).filter(
    (entry) =>
      entry.status === "completed" &&
      (entry.pickupDate || entry.date || "") < beforeDate,
  );
  const plans = (data.productionPlans || []).filter(
    (entry) => entry.status === "completed" && entry.date < beforeDate,
  );
  if (!orders.length && !plans.length)
    throw Error("No completed records are old enough to archive.");
  const archive = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    beforeDate,
    orders,
    productionPlans: plans,
  };
  return {
    ...data,
    archives: [...(data.archives || []), archive],
    orders: data.orders.filter(
      (entry) => !orders.some((old) => old.id === entry.id),
    ),
    productionPlans: data.productionPlans.filter(
      (entry) => !plans.some((old) => old.id === entry.id),
    ),
  };
}

export function restoreArchive(data, archiveId) {
  const archive = (data.archives || []).find((entry) => entry.id === archiveId);
  if (!archive) throw Error("Archive is missing.");
  return {
    ...data,
    orders: [...data.orders, ...(archive.orders || [])],
    productionPlans: [
      ...data.productionPlans,
      ...(archive.productionPlans || []),
    ],
    archives: data.archives.filter((entry) => entry.id !== archiveId),
  };
}
