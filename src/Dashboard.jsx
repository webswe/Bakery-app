import React, { useMemo, useState } from "react";
import { ArrowUpRight, Settings2 } from "lucide-react";
import { saleRevenue } from "./taxation.js";
import { monthlySummary, previousMonth } from "./analytics.js";
import { stockAlerts } from "./business.js";
import DashboardCustomizer from "./DashboardCustomizer.jsx";
import { normalizeDashboardConfig } from "./dashboardConfig.js";

const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

export default function Dashboard({ data, month, save, navigate }) {
  const savedConfig = normalizeDashboardConfig(data.settings?.dashboard);
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState(savedConfig);
  const config = customizing ? draft : savedConfig;
  const summary = monthlySummary(data, month);
  const previous = monthlySummary(data, previousMonth(month));
  const days = new Date(+month.slice(0, 4), +month.slice(5), 0).getDate();
  const daily = useMemo(() => Array.from({ length: days }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const sales = summary.sales.filter((sale) => sale.date === date);
    const expenses = summary.expenses.filter((expense) => expense.date === date);
    return { day: index + 1, revenue: sales.reduce((total, sale) => total + saleRevenue(sale), 0), cost: sales.reduce((total, sale) => total + sale.cost, 0) + expenses.reduce((total, expense) => total + expense.amount, 0) };
  }), [data.sales, data.expenses, days, month]);
  const grouped = Object.values(summary.sales.reduce((groups, sale) => {
    const key = sale.recipeId || sale.name;
    groups[key] ??= { name: sale.name, quantity: 0, revenue: 0, cost: 0 };
    groups[key].quantity += sale.quantity;
    groups[key].revenue += saleRevenue(sale);
    groups[key].cost += sale.cost;
    return groups;
  }, {})).sort((a, b) => b.revenue - a.revenue);
  const max = Math.max(1, ...daily.flatMap((item) => [item.revenue, item.cost]));
  const maxRecipe = Math.max(1, ...grouped.map((item) => item.revenue));
  const points = (key) => daily.map((item, index) => `${72 + index * (650 / Math.max(1, days - 1))},${190 - item[key] / max * 150}`).join(" ");
  const alerts = stockAlerts(data);
  const outOfStock = data.items.filter((item) => (item.stock || 0) <= 0).length;
  const lowStock = alerts.filter((item) => (item.stock || 0) > 0).length;
  const healthyStock = Math.max(0, data.items.length - outOfStock - lowStock);
  const totalStock = Math.max(1, data.items.length);
  const closeCustomizer = () => {
    save({ ...data, settings: { ...data.settings, dashboard: draft } });
    setCustomizing(false);
  };
  const visible = (id) => !config.hidden.includes(id);

  const cards = {
    trend: <section className="panel dashboard-card dashboard-wide" key="trend"><PanelHeading title="Revenue & costs" text="Daily movement across the selected month." badge={month} /><div className="chart-key"><span><i />Revenue</span><span><i />Total costs</span></div><div className="chart-wrap"><svg viewBox="0 0 740 230" role="img" aria-label={`Revenue ${money(summary.revenue)} and costs ${money(summary.costs + summary.overhead)} for ${month}`}>
      {[0, .25, .5, .75, 1].map((fraction) => <g key={fraction}><line x1="67" y1={190 - fraction * 150} x2="725" y2={190 - fraction * 150} stroke="#e5ecef" /><text x="57" y={194 - fraction * 150} textAnchor="end">{money(max * fraction)}</text></g>)}
      {config.chartStyle === "bars" ? daily.map((item, index) => { const width = 650 / days; const x = 72 + index * width; return <g key={item.day}><rect x={x} y={190 - item.revenue / max * 150} width={Math.max(2, width * .32)} height={item.revenue / max * 150} rx="2" className="revenue-bar" /><rect x={x + width * .35} y={190 - item.cost / max * 150} width={Math.max(2, width * .32)} height={item.cost / max * 150} rx="2" className="cost-bar" /></g>; }) : <><polygon points={`72,190 ${points("revenue")} 722,190`} className="revenue-area" /><polyline points={points("revenue")} className="revenue-line" /><polyline points={points("cost")} className="cost-line" /></>}
      {daily.map((item, index) => (index === 0 || item.day % 5 === 0 || item.day === days) && <text key={item.day} x={72 + index * (650 / Math.max(1, days - 1))} y="215" textAnchor="middle">{item.day}</text>)}
    </svg></div>{!summary.orders && !summary.expenses.length && <p className="chart-empty">Record sales and expenses to populate this chart.</p>}</section>,
    profitLoss: <section className="panel dashboard-card" key="profitLoss"><PanelHeading title="Profit & loss" text="Based on recorded transactions." /><div className="pl-table">{[["Sales revenue", summary.revenue], ["Production costs", -summary.costs], ["Gross profit", summary.revenue - summary.costs], ["Operating expenses", -summary.overhead], ["Net profit / loss", summary.profit]].map(([name, value], index) => <div key={name} className={`${index === 2 ? "subtotal " : ""}${index === 4 ? "total " : ""}${value < 0 ? "negative" : ""}`}><span>{name}</span><b>{money(value)}</b></div>)}</div></section>,
    salesMix: <section className="panel dashboard-card" key="salesMix"><PanelHeading title="Sales mix" text="Share of monthly product revenue." /><div className="sales-mix">{grouped.length ? <><div className="donut" style={{ background: salesMixGradient(grouped) }}><span><b>{grouped.length}</b>products</span></div><div className="sales-mix-list">{grouped.slice(0, 5).map((item, index) => <div key={item.name}><i style={{ background: mixColors[index % mixColors.length] }} /><span>{item.name}</span><b>{summary.revenue ? `${(item.revenue / summary.revenue * 100).toFixed(0)}%` : "0%"}</b></div>)}</div></> : <p className="empty-inline">No product sales this month.</p>}</div></section>,
    inventoryHealth: <section className="panel dashboard-card" key="inventoryHealth"><PanelHeading title="Inventory health" text="Current ingredient and packaging status." /><div className="inventory-health"><div className="stock-bar"><i className="healthy" style={{ width: `${healthyStock / totalStock * 100}%` }} /><i className="low" style={{ width: `${lowStock / totalStock * 100}%` }} /><i className="out" style={{ width: `${outOfStock / totalStock * 100}%` }} /></div><dl><div><dt>Healthy</dt><dd>{healthyStock}</dd></div><div><dt>Low / expiring</dt><dd>{lowStock}</dd></div><div><dt>Out of stock</dt><dd>{outOfStock}</dd></div></dl><button className="text-button" onClick={() => navigate("Inventory dashboard")}>Review inventory <ArrowUpRight size={14} /></button></div></section>,
    productPerformance: <section className="panel dashboard-card dashboard-wide" key="productPerformance"><PanelHeading title="Product performance" text="Ranked by revenue; profit excludes operating expenses." /><div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>PORTIONS</th><th>REVENUE</th><th>GROSS PROFIT</th><th>MARGIN</th></tr></thead><tbody>{grouped.map((item) => <tr key={item.name}><td><b>{item.name}</b><div className="performance-bar"><i style={{ width: `${item.revenue / maxRecipe * 100}%` }} /></div></td><td>{item.quantity}</td><td>{money(item.revenue)}</td><td>{money(item.revenue - item.cost)}</td><td>{item.revenue ? `${((item.revenue - item.cost) / item.revenue * 100).toFixed(1)}%` : "—"}</td></tr>)}</tbody></table></div>{!grouped.length && <p className="empty-inline">Record a sale to compare product performance.</p>}</section>,
    costingHealth: <section className="panel dashboard-card" key="costingHealth"><PanelHeading title="Costing health" text="Keep recipe estimates complete." /><div className="health-list"><div><span>Cup conversions</span><b>{data.items.filter((item) => item.type === "ingredient" && (item.gramsPerCup || item.density)).length} / {data.items.filter((item) => item.type === "ingredient").length}</b></div><div><span>Recipes</span><b>{data.recipes.length}</b></div><div><span>Food tax default</span><b>{data.taxRates.food}%</b></div><div><span>Other tax default</span><b>{data.taxRates.other}%</b></div></div></section>,
  };

  return <div className="owner-dashboard">
    <div className="dashboard-actions"><button className="secondary" onClick={() => { if (customizing) closeCustomizer(); else { setDraft(savedConfig); setCustomizing(true); } }}><Settings2 size={16} />{customizing ? "Save dashboard" : "Customize dashboard"}</button></div>
    {customizing && <DashboardCustomizer value={draft} onChange={setDraft} onClose={closeCustomizer} />}
    {config.showToday && <section className="today-board" aria-label="Today's work"><div><span className="eyebrow">TODAY’S WORK</span><h2>Keep your bakery moving</h2></div><div className="today-grid">{[["Orders", data.orders.filter((order) => order.status === "open").length, "Open orders", "Review payments and pickups"], ["Daily planner", data.productionPlans.filter((plan) => plan.status === "planned" && plan.date <= new Date().toLocaleDateString("en-CA")).reduce((total, plan) => total + plan.batches, 0), "Batches due", "Includes overdue production"], ["Waste & expiry", alerts.length, "Stock alerts", "Low stock and expiry"]].map(([target, value, label, hint]) => <button key={target} onClick={() => navigate(target)}><span>{label}</span><strong>{value}</strong><small>{hint}</small><ArrowUpRight size={17} /></button>)}</div></section>}
    {config.showSummary && <div className="stats">{[["Total revenue", summary.revenue, "Excludes separately recorded sales tax"], ["Cost of goods", summary.costs, "Production including labor and overhead"], ["Operating expenses", summary.overhead, "Day-to-day business costs"], ["Net profit", summary.profit, "Revenue minus costs and expenses"]].map(([title, value, hint], index) => <div className={`stat ${index === 3 ? "green" : ""}`} key={title}><div>{title}</div><strong>{money(value)}</strong><small>{hint}</small></div>)}</div>}
    {config.showMetrics && <div className="metric-strip">{[["Sales recorded", summary.orders], ["Portions sold", summary.portions], ["Average sale", summary.orders ? money(summary.revenue / summary.orders) : "—"], ["Net margin", summary.revenue ? `${(summary.profit / summary.revenue * 100).toFixed(1)}%` : "—"], ["Revenue vs. prior month", previous.revenue ? `${((summary.revenue - previous.revenue) / previous.revenue * 100).toFixed(1)}%` : "No prior sales"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
    <div className="custom-dashboard-grid">{config.order.filter(visible).map((id) => cards[id])}</div>
  </div>;
}

function PanelHeading({ title, text, badge }) { return <div className="panel-heading"><div><h2>{title}</h2><p>{text}</p></div>{badge && <span className="pill">{badge}</span>}</div>; }
const mixColors = ["#315e56", "#d49a62", "#6e8faa", "#a97086", "#91a66f"];
function salesMixGradient(rows) {
  const total = rows.reduce((sum, row) => sum + row.revenue, 0) || 1;
  let start = 0;
  const stops = rows.slice(0, 5).map((row, index) => { const end = start + row.revenue / total * 100; const stop = `${mixColors[index % mixColors.length]} ${start}% ${end}%`; start = end; return stop; });
  if (start < 100) stops.push(`#dfe7e9 ${start}% 100%`);
  return `conic-gradient(${stops.join(",")})`;
}
