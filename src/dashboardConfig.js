export const dashboardWidgets = [
  { id: "trend", label: "Revenue trend", description: "Revenue and total costs across the selected month." },
  { id: "profitLoss", label: "Profit and loss", description: "A compact monthly income statement." },
  { id: "salesMix", label: "Sales mix", description: "How each product contributes to revenue." },
  { id: "inventoryHealth", label: "Inventory health", description: "Healthy, low, and out-of-stock inventory." },
  { id: "productPerformance", label: "Product performance", description: "Revenue, profit, and margin by product." },
  { id: "costingHealth", label: "Costing health", description: "Conversion and recipe setup completeness." },
];

export const defaultDashboardConfig = {
  showToday: true,
  showSummary: true,
  showMetrics: true,
  showRecent: true,
  chartStyle: "area",
  order: dashboardWidgets.map((widget) => widget.id),
  hidden: [],
};

export function normalizeDashboardConfig(value = {}) {
  const known = dashboardWidgets.map((widget) => widget.id);
  const supplied = Array.isArray(value.order) ? value.order.filter((id) => known.includes(id)) : [];
  return {
    ...defaultDashboardConfig,
    ...value,
    order: [...supplied, ...known.filter((id) => !supplied.includes(id))],
    hidden: Array.isArray(value.hidden) ? value.hidden.filter((id) => known.includes(id)) : [],
  };
}
