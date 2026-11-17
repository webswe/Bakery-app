import { localDay } from "./dateUtils.js";

export const expenseCategories = [
  "Rent",
  "Utilities",
  "Payroll",
  "Supplies",
  "Delivery",
  "Marketing",
  "Repairs",
  "Fees",
  "Insurance",
  "Professional services",
  "Other",
];

export const expensePaymentMethods = [
  "Cash",
  "Card",
  "Bank transfer",
  "Check",
  "Other",
];

const text = (value) => String(value || "").trim();

function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return false;
  const date = new Date(`${value}T12:00:00`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === Number(match[1]) &&
    date.getMonth() + 1 === Number(match[2]) &&
    date.getDate() === Number(match[3])
  );
}

export function saveExpense(data, input) {
  const name = text(input.name);
  const amount = Number(input.amount);
  const date = input.date || localDay();
  if (!name) throw Error("Enter an expense description.");
  if (!Number.isFinite(amount) || amount <= 0)
    throw Error("Enter an expense amount greater than zero.");
  if (!validDate(date)) throw Error("Enter a valid expense date.");

  const existing = (data.expenses || []).find((row) => row.id === input.id);
  const now = new Date().toISOString();
  const expense = {
    ...existing,
    id: input.id || crypto.randomUUID(),
    name,
    amount: Math.round((amount + Number.EPSILON) * 100) / 100,
    date,
    category: expenseCategories.includes(input.category)
      ? input.category
      : "Other",
    vendor: text(input.vendor),
    paymentMethod: expensePaymentMethods.includes(input.paymentMethod)
      ? input.paymentMethod
      : "Other",
    notes: text(input.notes),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  return {
    ...data,
    expenses: [
      ...(data.expenses || []).filter((row) => row.id !== expense.id),
      expense,
    ],
  };
}

export function removeExpense(data, id) {
  if (!(data.expenses || []).some((row) => row.id === id))
    throw Error("Expense record is missing.");
  return {
    ...data,
    expenses: data.expenses.filter((row) => row.id !== id),
  };
}

export function expenseLedger(
  data,
  { month = "", category = "All", query = "" } = {},
) {
  const search = text(query).toLocaleLowerCase();
  return (data.expenses || [])
    .filter((row) => !month || row.date?.startsWith(month))
    .filter((row) => category === "All" || row.category === category)
    .filter(
      (row) =>
        !search ||
        [row.name, row.vendor, row.category, row.paymentMethod, row.notes]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(search),
    )
    .sort(
      (a, b) =>
        (b.date || "").localeCompare(a.date || "") ||
        (b.updatedAt || "").localeCompare(a.updatedAt || ""),
    );
}

export function expenseSummary(rows) {
  const byCategory = rows.reduce((totals, row) => {
    const category = row.category || "Other";
    totals[category] = (totals[category] || 0) + (Number(row.amount) || 0);
    return totals;
  }, {});
  const categories = Object.entries(byCategory)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  return {
    total: rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    count: rows.length,
    categories,
    largest: categories[0] || null,
  };
}

const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

export function expenseCsv(rows) {
  return [
    [
      "Date",
      "Description",
      "Category",
      "Vendor",
      "Payment method",
      "Amount",
      "Notes",
    ],
    ...rows.map((row) => [
      row.date,
      row.name,
      row.category || "Other",
      row.vendor,
      row.paymentMethod,
      Number(row.amount || 0).toFixed(2),
      row.notes,
    ]),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
}
