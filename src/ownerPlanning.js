const clean = (value) => String(value || "").trim();

export function saveOwnerTask(data, input, id = "") {
  const title = clean(input.title);
  if (!title) throw Error("Enter a task title.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate || ""))
    throw Error("Choose a due date.");
  const existing = (data.ownerTasks || []).find((task) => task.id === id);
  const task = {
    ...existing,
    id: id || crypto.randomUUID(),
    title,
    dueDate: input.dueDate,
    priority: ["low", "normal", "high"].includes(input.priority)
      ? input.priority
      : "normal",
    category: clean(input.category) || "General",
    notes: clean(input.notes),
    completedAt: existing?.completedAt || "",
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  return {
    ...data,
    ownerTasks: [
      ...(data.ownerTasks || []).filter((item) => item.id !== task.id),
      task,
    ],
  };
}

export function toggleOwnerTask(
  data,
  id,
  completedAt = new Date().toISOString(),
) {
  if (!(data.ownerTasks || []).some((task) => task.id === id))
    throw Error("Task not found.");
  return {
    ...data,
    ownerTasks: data.ownerTasks.map((task) =>
      task.id === id
        ? { ...task, completedAt: task.completedAt ? "" : completedAt }
        : task,
    ),
  };
}

export function removeOwnerTask(data, id) {
  return {
    ...data,
    ownerTasks: (data.ownerTasks || []).filter((task) => task.id !== id),
  };
}

export function taskSummary(data, day) {
  const open = (data.ownerTasks || []).filter((task) => !task.completedAt);
  return {
    overdue: open.filter((task) => task.dueDate < day),
    today: open.filter((task) => task.dueDate === day),
    upcoming: open
      .filter((task) => task.dueDate > day)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    completed: (data.ownerTasks || []).filter((task) => task.completedAt),
  };
}

export function normalizeOwnerGoals(value = {}) {
  const number = (input) => Math.max(0, Number(input) || 0);
  return {
    monthlyRevenue: number(value.monthlyRevenue),
    monthlyProfit: number(value.monthlyProfit),
    weeklyBatches: number(value.weeklyBatches),
  };
}
