import { recipePricingPlan } from "./recipePricing.js";

const clean = (value) => String(value || "").trim();
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "");
const csvFields = {
  ingredients: [
    "id",
    "name",
    "type",
    "amount",
    "unit",
    "price",
    "stock",
    "supplier",
    "minStock",
  ],
  recipes: [
    "id",
    "name",
    "category",
    "yield",
    "saleFormat",
    "saleQuantity",
    "salePrice",
    "allergens",
    "lines",
  ],
  customers: [
    "id",
    "name",
    "phone",
    "email",
    "preferences",
    "allergies",
    "notes",
  ],
  sales: [
    "id",
    "date",
    "recipeId",
    "name",
    "quantity",
    "net",
    "tax",
    "total",
    "cost",
    "customer",
  ],
};
const requiredCsvFields = {
  ingredients: ["name", "amount", "unit", "price"],
  recipes: ["name", "yield", "lines"],
  customers: ["name"],
  sales: ["date", "name", "total"],
};
const numericCsvFields = new Set([
  "amount",
  "price",
  "stock",
  "minStock",
  "yield",
  "saleQuantity",
  "salePrice",
  "quantity",
  "net",
  "tax",
  "total",
  "cost",
]);

export function saveOrderRequest(data, input, id = "") {
  const customer = clean(input.customer);
  if (!customer) throw Error("Enter the customer name.");
  if (!validDate(input.pickupDate)) throw Error("Choose a pickup date.");
  const request = {
    ...(data.orderRequests || []).find((entry) => entry.id === id),
    id: id || crypto.randomUUID(),
    customer,
    pickupDate: input.pickupDate,
    pickupTime: clean(input.pickupTime),
    occasion: clean(input.occasion),
    servings: Math.max(0, Number(input.servings) || 0),
    flavors: clean(input.flavors),
    design: clean(input.design),
    dietary: clean(input.dietary),
    budget: Math.max(0, Number(input.budget) || 0),
    notes: clean(input.notes),
    photo: input.photo || "",
    status: input.status || "inquiry",
    updatedAt: new Date().toISOString(),
  };
  return {
    ...data,
    orderRequests: [
      ...(data.orderRequests || []).filter((entry) => entry.id !== request.id),
      request,
    ],
  };
}

export function productionTimeline(data, date, startTime = "06:00") {
  const [hour, minute] = startTime.split(":").map(Number);
  let cursor = hour * 60 + minute;
  const rows = [];
  for (const plan of (data.productionPlans || []).filter(
    (entry) => entry.date === date && entry.status === "planned",
  )) {
    const recipe =
      plan.recipeSnapshot?.recipe ||
      data.recipes.find((entry) => entry.id === plan.recipeId) ||
      {};
    const phases = [
      ["Prep", recipe.prepMinutes || recipe.laborMinutes || 0],
      ["Bake", recipe.bakeMinutes || 0],
      ["Cool", recipe.coolingMinutes || 0],
      [
        "Decorate & pack",
        Math.max(10, (recipe.laborMinutes || 0) - (recipe.prepMinutes || 0)),
      ],
    ];
    for (const [phase, minutes] of phases) {
      const duration =
        Math.max(0, Number(minutes) || 0) *
        Math.max(1, Number(plan.batches) || 1);
      if (!duration) continue;
      rows.push({
        id: `${plan.id}-${phase}`,
        planId: plan.id,
        recipeName: recipe.name || plan.recipeName,
        phase,
        start: cursor,
        end: cursor + duration,
        duration,
        equipment: recipe.equipment || "",
      });
      cursor += duration;
    }
  }
  return rows;
}

export function timeLabel(minutes) {
  const value = Math.max(0, Number(minutes) || 0);
  const hour = Math.floor(value / 60) % 24;
  return `${String(hour).padStart(2, "0")}:${String(Math.round(value % 60)).padStart(2, "0")}`;
}

export function saveRecurringTask(data, input, id = "") {
  const title = clean(input.title);
  if (!title) throw Error("Enter a task name.");
  const task = {
    id: id || crypto.randomUUID(),
    title,
    weekdays: (input.weekdays || []).map(Number),
    time: input.time || "06:00",
    area: clean(input.area),
    notes: clean(input.notes),
    active: input.active !== false,
  };
  return {
    ...data,
    recurringTasks: [
      ...(data.recurringTasks || []).filter((entry) => entry.id !== task.id),
      task,
    ],
  };
}

export function tasksForDate(data, date) {
  const weekday = new Date(`${date}T12:00:00`).getDay();
  return (data.recurringTasks || [])
    .filter((task) => task.active !== false && task.weekdays.includes(weekday))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function saveSubstitution(data, input, id = "") {
  if (
    !input.itemId ||
    !input.replacementId ||
    input.itemId === input.replacementId
  )
    throw Error("Choose two different ingredients.");
  const substitution = {
    id: id || crypto.randomUUID(),
    itemId: input.itemId,
    replacementId: input.replacementId,
    ratio: Math.max(0.001, Number(input.ratio) || 1),
    notes: clean(input.notes),
    approved: true,
  };
  return {
    ...data,
    substitutions: [
      ...(data.substitutions || []).filter(
        (entry) => entry.id !== substitution.id,
      ),
      substitution,
    ],
  };
}

export function recipeCostAlerts(data) {
  return (data.recipes || [])
    .map((recipe) => {
      try {
        const plan = recipePricingPlan(
          recipe,
          data.items,
          data.settings,
          recipe.pricingPlan,
        );
        return { recipe, ...plan };
      } catch (error) {
        return { recipe, error: error.message };
      }
    })
    .filter((entry) => entry.error || entry.margin + 0.001 < entry.targetMargin)
    .sort((a, b) => (a.margin || 0) - (b.margin || 0));
}

export function salesTrend(data, months = 6) {
  const now = new Date();
  return Array.from({ length: months }, (_, reverse) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1 - reverse),
      1,
    );
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const sales = (data.sales || []).filter((entry) =>
      entry.date?.startsWith(key),
    );
    const revenue = sales.reduce(
      (sum, entry) => sum + Number(entry.net ?? entry.total ?? 0),
      0,
    );
    const cost = sales.reduce((sum, entry) => sum + Number(entry.cost || 0), 0);
    return {
      key,
      label: date.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      }),
      orders: sales.length,
      revenue,
      profit: revenue - cost,
    };
  });
}

const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
export function exportCsv(data, type) {
  const fields = csvFields[type];
  if (!fields) throw Error("Unknown CSV export.");
  const rows = type === "ingredients" ? data.items : data[type];
  return [
    fields.map(escapeCsv).join(","),
    ...(rows || []).map((row) =>
      fields
        .map((field) =>
          escapeCsv(
            field === "lines" ? JSON.stringify(row.lines || []) : row[field],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let index = 0; index < String(text).length; index += 1) {
    const char = text[index],
      next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift() || [];
  return rows.map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index] || ""]),
    ),
  );
}

export function importCsv(data, type, text) {
  const fields = csvFields[type];
  if (!fields) throw Error("Unknown CSV import.");
  const rows = parseCsv(text);
  if (!rows.length) throw Error("The CSV file has no records.");
  const headers = new Set(Object.keys(rows[0]));
  const missing = requiredCsvFields[type].filter(
    (field) => !headers.has(field),
  );
  if (missing.length)
    throw Error(`CSV is missing required column(s): ${missing.join(", ")}.`);
  const parsed = rows
    .map((row) =>
      Object.fromEntries(
        fields.map((field) => {
          const value = row[field] ?? "";
          if (field === "lines") return [field, JSON.parse(value || "[]")];
          return [
            field,
            numericCsvFields.has(field) ? Number(value) || 0 : value,
          ];
        }),
      ),
    )
    .map((row) => ({ ...row, id: row.id || crypto.randomUUID() }));
  const key = type === "ingredients" ? "items" : type;
  const existing = data[key] || [];
  return {
    ...data,
    [key]: [
      ...existing.filter((entry) => !parsed.some((row) => row.id === entry.id)),
      ...parsed,
    ],
  };
}

export function backupSummary(value) {
  const data = typeof value === "string" ? JSON.parse(value) : value;
  for (const key of ["items", "recipes", "sales", "expenses"])
    if (!Array.isArray(data?.[key]))
      throw Error("This is not a valid Bakery Ledger backup.");
  return {
    data,
    counts: {
      ingredients: data.items.length,
      recipes: data.recipes.length,
      customers: (data.customers || []).length,
      orders: (data.orders || []).length,
      sales: data.sales.length,
    },
  };
}
