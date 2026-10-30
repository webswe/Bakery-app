import React from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, X } from "lucide-react";
import { dashboardWidgets, defaultDashboardConfig, normalizeDashboardConfig } from "./dashboardConfig.js";

export default function DashboardCustomizer({ value, onChange, onClose }) {
  const config = normalizeDashboardConfig(value);
  const patch = (next) => onChange({ ...config, ...next });
  const move = (id, direction) => {
    const order = [...config.order];
    const from = order.indexOf(id);
    const to = from + direction;
    if (to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    patch({ order });
  };
  const toggleWidget = (id) => patch({ hidden: config.hidden.includes(id) ? config.hidden.filter((item) => item !== id) : [...config.hidden, id] });
  return (
    <section className="panel dashboard-customizer" aria-label="Customize dashboard">
      <div className="panel-heading"><div><h2>Customize your overview</h2><p>Choose what deserves space and arrange the analytics cards.</p></div><button className="icon-button" onClick={onClose} aria-label="Close dashboard customization"><X size={18} /></button></div>
      <div className="dashboard-toggle-grid">
        {[['showToday', 'Today’s work'], ['showSummary', 'Financial summary'], ['showMetrics', 'Quick metrics'], ['showRecent', 'Recent activity']].map(([key, label]) => <label key={key}><input type="checkbox" checked={config[key]} onChange={(event) => patch({ [key]: event.target.checked })} />{label}</label>)}
      </div>
      <div className="dashboard-chart-choice"><span>Trend chart</span><button className={config.chartStyle === "area" ? "selected" : ""} onClick={() => patch({ chartStyle: "area" })}>Smooth line</button><button className={config.chartStyle === "bars" ? "selected" : ""} onClick={() => patch({ chartStyle: "bars" })}>Daily bars</button></div>
      <div className="dashboard-widget-list">
        {config.order.map((id, index) => {
          const widget = dashboardWidgets.find((item) => item.id === id);
          const hidden = config.hidden.includes(id);
          return <div key={id} className={hidden ? "hidden-widget" : ""}><button className="icon-button" onClick={() => toggleWidget(id)} aria-label={`${hidden ? "Show" : "Hide"} ${widget.label}`}>{hidden ? <EyeOff size={17} /> : <Eye size={17} />}</button><span><b>{widget.label}</b><small>{widget.description}</small></span><button className="icon-button" disabled={index === 0} onClick={() => move(id, -1)} aria-label={`Move ${widget.label} up`}><ArrowUp size={16} /></button><button className="icon-button" disabled={index === config.order.length - 1} onClick={() => move(id, 1)} aria-label={`Move ${widget.label} down`}><ArrowDown size={16} /></button></div>;
        })}
      </div>
      <button className="secondary" onClick={() => onChange(defaultDashboardConfig)}><RotateCcw size={15} />Reset dashboard</button>
    </section>
  );
}
