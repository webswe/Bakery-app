export const recentPagesKey = "bakery-ledger-recent-pages-v1";

export function readRecentPages(storage) {
  try {
    const value = JSON.parse(storage.getItem(recentPagesKey));
    return Array.isArray(value) ? value.filter((page) => typeof page === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

export function rememberPage(storage, pages, page) {
  const next = [page, ...pages.filter((item) => item !== page)].slice(0, 6);
  storage.setItem(recentPagesKey, JSON.stringify(next));
  return next;
}

export function workspaceNotifications(data, day) {
  const rows = [];
  const overdueTasks = (data.ownerTasks || []).filter((task) => !task.completedAt && task.dueDate < day);
  const todayTasks = (data.ownerTasks || []).filter((task) => !task.completedAt && task.dueDate === day);
  const urgentOrders = (data.orders || []).filter((order) => order.status === "open" && order.pickupDate <= day);
  const lowStock = (data.items || []).filter((item) => (item.stock || 0) <= (item.minStock || 0));
  const incompleteItems = (data.items || []).filter((item) => item.needsPrice);
  if (overdueTasks.length) rows.push({ id: "overdue-tasks", level: "danger", label: `${overdueTasks.length} overdue owner task${overdueTasks.length === 1 ? "" : "s"}`, page: "Goals & tasks" });
  if (todayTasks.length) rows.push({ id: "today-tasks", level: "warning", label: `${todayTasks.length} owner task${todayTasks.length === 1 ? "" : "s"} due today`, page: "Goals & tasks" });
  if (urgentOrders.length) rows.push({ id: "pickup-orders", level: "danger", label: `${urgentOrders.length} open pickup${urgentOrders.length === 1 ? "" : "s"} due`, page: "Orders" });
  if (lowStock.length) rows.push({ id: "low-stock", level: "warning", label: `${lowStock.length} item${lowStock.length === 1 ? "" : "s"} at or below minimum stock`, page: "Inventory dashboard" });
  if (incompleteItems.length) rows.push({ id: "missing-prices", level: "info", label: `${incompleteItems.length} inventory price${incompleteItems.length === 1 ? "" : "s"} need completion`, page: "Ingredients" });
  return rows;
}
