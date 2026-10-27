import React from "react";
import { monthlySummary, previousMonth } from "./analytics.js";
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
export default function Dashboard({ data, month }) {
  const s = monthlySummary(data, month),
    prev = monthlySummary(data, previousMonth(month));
  const days = new Date(+month.slice(0, 4), +month.slice(5), 0).getDate();
  const daily = Array.from({ length: days }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, "0")}`;
    const sales = s.sales.filter((x) => x.date === date),
      expenses = s.expenses.filter((x) => x.date === date);
    return {
      day: i + 1,
      revenue: sales.reduce((n, x) => n + x.total, 0),
      cost:
        sales.reduce((n, x) => n + x.cost, 0) +
        expenses.reduce((n, x) => n + x.amount, 0),
    };
  });
  const max = Math.max(1, ...daily.flatMap((x) => [x.revenue, x.cost]));
  const grouped = Object.values(
    s.sales.reduce((a, x) => {
      const key = x.recipeId || x.name;
      a[key] ??= { name: x.name, quantity: 0, revenue: 0, cost: 0 };
      a[key].quantity += x.quantity;
      a[key].revenue += x.total;
      a[key].cost += x.cost;
      return a;
    }, {}),
  ).sort((a, b) => b.revenue - a.revenue);
  const maxRecipe = Math.max(1, ...grouped.map((x) => x.revenue));
  return (
    <>
      <div className="metric-strip">
        <div>
          <span>Sales recorded</span>
          <strong>{s.orders}</strong>
        </div>
        <div>
          <span>Portions sold</span>
          <strong>{s.portions}</strong>
        </div>
        <div>
          <span>Average sale</span>
          <strong>{s.orders ? money(s.revenue / s.orders) : "—"}</strong>
        </div>
        <div>
          <span>Net margin</span>
          <strong className={s.profit < 0 ? "negative" : ""}>
            {s.revenue ? `${((s.profit / s.revenue) * 100).toFixed(1)}%` : "—"}
          </strong>
        </div>
        <div>
          <span>Revenue vs. previous month</span>
          <strong>
            {prev.revenue
              ? `${(((s.revenue - prev.revenue) / prev.revenue) * 100).toFixed(1)}%`
              : "No prior sales"}
          </strong>
        </div>
      </div>
      <div className="analytics-grid">
        <section className="panel trend-panel">
          <div className="panel-heading">
            <div>
              <h2>Revenue & costs</h2>
              <p>
                Daily sales compared with ingredient costs and operating
                expenses.
              </p>
            </div>
            <span className="pill">{month}</span>
          </div>
          <div className="chart-key">
            <span>
              <i />
              Revenue
            </span>
            <span>
              <i />
              Total costs
            </span>
          </div>
          <div className="chart-wrap">
            <svg
              viewBox="0 0 740 240"
              role="img"
              aria-label={`Daily revenue and total costs for ${month}. Revenue ${money(s.revenue)}, costs ${money(s.costs + s.overhead)}.`}
            >
              {[0, 0.25, 0.5, 0.75, 1].map((f) => (
                <g key={f}>
                  <line
                    x1="67"
                    y1={190 - f * 160}
                    x2="725"
                    y2={190 - f * 160}
                    stroke="#e8edf1"
                  />
                  <text x="56" y={194 - f * 160} textAnchor="end">
                    {money(max * f)}
                  </text>
                </g>
              ))}
              {daily.map((d, i) => {
                const x = 72 + i * (650 / days),
                  w = 650 / days;
                return (
                  <g key={i}>
                    <title>{`${month}-${d.day}: Revenue ${money(d.revenue)}, costs ${money(d.cost)}`}</title>
                    <rect
                      x={x}
                      y={190 - (d.revenue / max) * 160}
                      width={w * 0.34}
                      height={(d.revenue / max) * 160}
                      rx="2"
                      fill="#3e766a"
                    />
                    <rect
                      x={x + w * 0.36}
                      y={190 - (d.cost / max) * 160}
                      width={w * 0.34}
                      height={(d.cost / max) * 160}
                      rx="2"
                      fill="#d8a16d"
                    />
                    {(i === 0 || d.day % 5 === 0 || d.day === days) && (
                      <text x={x + w * 0.3} y="215" textAnchor="middle">
                        {d.day}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          {!s.orders && !s.expenses.length && (
            <p className="chart-empty">
              No activity this month. Record sales and expenses to populate this
              chart.
            </p>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Profit & loss</h2>
              <p>Based on recorded transactions.</p>
            </div>
          </div>
          <div className="pl-table">
            {[
              ["Sales revenue", s.revenue],
              ["Production costs", -s.costs],
              ["Gross profit", s.revenue - s.costs],
              ["Operating expenses", -s.overhead],
              ["Net profit / loss", s.profit],
            ].map(([name, n], i) => (
              <div
                key={name}
                className={`${i === 2 ? "subtotal " : ""}${i === 4 ? "total " : ""}${n < 0 ? "negative" : ""}`}
              >
                <span>{name}</span>
                <b>{money(n)}</b>
              </div>
            ))}
          </div>
          <p className="accounting-note">
            Recipe costs are captured when a sale is recorded. Add labor, rent,
            and utilities as expenses.
          </p>
        </section>
      </div>
      <div className="analytics-grid lower-analytics">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Product performance</h2>
              <p>
                Ranked by revenue · gross profit excludes operating expenses.
              </p>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>PORTIONS</th>
                  <th>REVENUE</th>
                  <th>GROSS PROFIT</th>
                  <th>MARGIN</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((r) => (
                  <tr key={r.name}>
                    <td>
                      <b>{r.name}</b>
                      <div className="performance-bar">
                        <i
                          style={{ width: `${(r.revenue / maxRecipe) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td>{r.quantity}</td>
                    <td>{money(r.revenue)}</td>
                    <td className={r.revenue - r.cost < 0 ? "negative" : ""}>
                      {money(r.revenue - r.cost)}
                    </td>
                    <td>
                      {r.revenue
                        ? `${(((r.revenue - r.cost) / r.revenue) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!grouped.length && (
            <div className="empty">
              <h3>No product sales yet</h3>
              <p>Record a sale to see your best-performing recipes.</p>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Costing health</h2>
              <p>Keep your recipe estimates complete.</p>
            </div>
          </div>
          <div className="health-list">
            <div>
              <span>Food tax default</span>
              <b>{data.taxRates.food}%</b>
            </div>
            <div>
              <span>Other tax default</span>
              <b>{data.taxRates.other}%</b>
            </div>
            <div>
              <span>Ingredients with cup conversions</span>
              <b>
                {
                  data.items.filter(
                    (i) =>
                      i.type === "ingredient" && (i.gramsPerCup || i.density),
                  ).length
                }{" "}
                / {data.items.filter((i) => i.type === "ingredient").length}
              </b>
            </div>
            <div>
              <span>Recipes in your collection</span>
              <b>{data.recipes.length}</b>
            </div>
          </div>
          <p className="accounting-note">
            Tax defaults apply to new purchases. Existing item costs and
            recorded sales keep their saved rates.
          </p>
        </section>
      </div>
    </>
  );
}

