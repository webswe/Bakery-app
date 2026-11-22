import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Download,
  PackageMinus,
  Plus,
  Trash2,
} from "lucide-react";
import { readBackups } from "./backupStorage.js";
import { savePlan } from "./planning.js";
import {
  bookkeepingCsv,
  bookkeepingLedger,
  cashFlowForecast,
  productionRecommendations,
  recordOwnerUse,
  removeCashPlan,
  saveCashPlan,
} from "./ownerDecisionSupport.js";
import { taskSummary } from "./ownerPlanning.js";
import { localDay, money } from "./uiFormatters.js";
import "./OwnerDecisionStyles.css";

const today = () => localDay();
const downloadText = (name, text) => {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

export default function OwnerDecisionWorkspace({ data, save, navigate }) {
  const [tab, setTab] = useState("today");
  const [day, setDay] = useState(today());
  const [notice, setNotice] = useState("");
  const recommendations = useMemo(
    () => productionRecommendations(data, day),
    [data, day],
  );
  const tasks = taskSummary(data, day);
  const urgent = recommendations.filter((row) => row.batches > 0);
  const pickups = (data.orders || [])
    .filter(
      (order) =>
        !["cancelled", "completed", "fulfilled"].includes(order.status) &&
        order.pickupDate === day,
    )
    .sort((a, b) =>
      String(a.customer || a.recipeName).localeCompare(
        String(b.customer || b.recipeName),
      ),
    );
  const act = (operation, message) => {
    try {
      if (save(operation()) !== false) setNotice(message);
    } catch (error) {
      setNotice(error.message);
    }
  };
  return (
    <div className="owner-decision-workspace">
      <section className="panel owner-decision-hero">
        <div>
          <span className="eyebrow">OWNER DAILY DESK</span>
          <h2>Decide what matters, then get back to the kitchen</h2>
          <p>
            Demand, stock, cash and safeguards are brought together here.
            Detailed records stay in their existing workspaces.
          </p>
        </div>
        <label>
          Working day
          <input
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
      </section>
      <nav className="owner-decision-tabs" aria-label="Owner desk tools">
        {[
          ["today", "Today"],
          ["production", "Production"],
          ["money", "Money"],
          ["tools", "Tools & safety"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            aria-current={tab === value ? "page" : undefined}
            onClick={() => {
              setTab(value);
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <p
          className={
            /saved|scheduled|recorded|download/i.test(notice)
              ? "positive"
              : "error"
          }
          role="status"
        >
          {notice}
        </p>
      )}
      {tab === "today" ? (
        <Today
          day={day}
          urgent={urgent}
          tasks={tasks}
          pickups={pickups}
          navigate={navigate}
          schedule={(row) =>
            act(
              () =>
                savePlan(data, {
                  recipeId: row.recipeId,
                  batches: row.batches,
                  date: day,
                  notes: `Suggested from recent sales and upcoming orders: ${row.reason}`,
                }),
              `${row.name} scheduled.`,
            )
          }
        />
      ) : tab === "production" ? (
        <Production
          data={data}
          day={day}
          recommendations={recommendations}
          act={act}
          navigate={navigate}
        />
      ) : tab === "money" ? (
        <Money data={data} day={day} act={act} />
      ) : (
        <Tools data={data} navigate={navigate} />
      )}
    </div>
  );
}

function Today({ day, urgent, tasks, pickups, navigate, schedule }) {
  const priorities = [
    ...(tasks.overdue.length
      ? [
          {
            label: `${tasks.overdue.length} overdue owner task(s)`,
            action: () => navigate("Goals & tasks"),
          },
        ]
      : []),
    ...(pickups.length
      ? [
          {
            label: `${pickups.length} pickup(s) due today`,
            action: () => navigate("Orders"),
          },
        ]
      : []),
    ...(urgent.length
      ? [
          {
            label: `${urgent.reduce((sum, row) => sum + row.batches, 0)} suggested batch(es)`,
            action: () => navigate("Daily planner"),
          },
        ]
      : []),
  ];
  return (
    <>
      <div className="owner-decision-metrics">
        <article className="panel">
          <span>Overdue tasks</span>
          <b>{tasks.overdue.length}</b>
        </article>
        <article className="panel">
          <span>Today’s pickups</span>
          <b>{pickups.length}</b>
        </article>
        <article className="panel">
          <span>Suggested batches</span>
          <b>{urgent.reduce((sum, row) => sum + row.batches, 0)}</b>
        </article>
        <article className="panel">
          <span>Date</span>
          <b>{day}</b>
        </article>
      </div>
      <div className="owner-decision-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Next decisions</h2>
              <p>Only items that need owner attention.</p>
            </div>
          </div>
          {priorities.map((item) => (
            <button
              className="owner-priority"
              onClick={item.action}
              key={item.label}
            >
              <span>{item.label}</span>
              <ArrowRight size={17} />
            </button>
          ))}
          {!priorities.length && (
            <p className="positive">No urgent owner decisions for this day.</p>
          )}
        </section>
        <section className="panel">
          <h2>Production suggestions</h2>
          {urgent.slice(0, 4).map((row) => (
            <div className="owner-recommendation" key={row.recipeId}>
              <span>
                <b>{row.name}</b>
                <small>
                  {row.portionsToMake} portions · {row.reason}
                </small>
              </span>
              <button className="secondary" onClick={() => schedule(row)}>
                <CalendarDays size={15} />
                Schedule {row.batches}
              </button>
            </div>
          ))}
          {!urgent.length && (
            <p className="empty-note">
              Current stock and scheduled production cover recorded demand.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Production({ data, day, recommendations, act, navigate }) {
  const [kind, setKind] = useState("ingredient");
  const records = kind === "dessert" ? data.recipes : data.items;
  return (
    <div className="owner-decision-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Seven-day demand guide</h2>
            <p>
              Recent sales, upcoming orders, finished stock and already-planned
              batches are combined. Suggestions never change stock by
              themselves.
            </p>
          </div>
          <button
            className="text-button"
            onClick={() => navigate("Smart schedule")}
          >
            Open detailed schedule
          </button>
        </div>
        {recommendations.map((row) => (
          <div className="owner-recommendation" key={row.recipeId}>
            <span>
              <b>{row.name}</b>
              <small>
                Demand {row.forecastDemand} · on hand {row.onHand} · scheduled{" "}
                {row.scheduled}
              </small>
              <small>{row.reason}</small>
            </span>
            <strong>
              {row.batches ? `${row.batches} batch(es)` : "Covered"}
            </strong>
          </div>
        ))}
        {!recommendations.length && (
          <p className="empty-note">
            Record sales or orders to build a forecast.
          </p>
        )}
      </section>
      <section className="panel planning-form">
        <h2>Record personal use</h2>
        <p>
          Remove owner/household use separately from sales and waste while
          retaining its cost and stock trail.
        </p>
        <form
          key={kind}
          onSubmit={(event) => {
            event.preventDefault();
            const input = Object.fromEntries(new FormData(event.currentTarget));
            act(() => recordOwnerUse(data, input), "Personal use recorded.");
            event.currentTarget.reset();
          }}
        >
          <div className="form-row">
            <label>
              Stock type
              <select
                name="kind"
                value={kind}
                onChange={(event) => setKind(event.target.value)}
              >
                <option value="ingredient">Ingredient / packaging</option>
                <option value="dessert">Finished dessert</option>
              </select>
            </label>
            <label>
              Item
              <select name="recordId" required>
                {records.map((row) => (
                  <option value={row.id} key={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Quantity
              <input
                name="quantity"
                type="number"
                min="0.001"
                step={kind === "dessert" ? "1" : "any"}
                required
              />
            </label>
            <label>
              Date
              <input name="date" type="date" defaultValue={day} required />
            </label>
          </div>
          <label>
            Note
            <input name="note" placeholder="Optional reason or household use" />
          </label>
          <button className="primary">
            <PackageMinus size={16} />
            Record personal use
          </button>
        </form>
        <p className="hint">
          Personal use is not reported as waste and does not create revenue.
        </p>
      </section>
    </div>
  );
}

function Money({ data, day, act }) {
  const [days, setDays] = useState(30);
  const [month, setMonth] = useState(day.slice(0, 7));
  const forecast = useMemo(
    () => cashFlowForecast(data, day, days),
    [data, day, days],
  );
  const ledger = useMemo(() => bookkeepingLedger(data, month), [data, month]);
  return (
    <>
      <div className="owner-decision-metrics">
        <article className="panel">
          <span>Opening cash</span>
          <b>{money(forecast.opening)}</b>
        </article>
        <article className="panel">
          <span>Expected in</span>
          <b>{money(forecast.totalIn)}</b>
        </article>
        <article className="panel">
          <span>Planned out</span>
          <b>{money(forecast.totalOut)}</b>
        </article>
        <article className="panel">
          <span>Forecast closing</span>
          <b>{money(forecast.closing)}</b>
        </article>
      </div>
      <div className="owner-decision-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Cash-flow runway</h2>
              <p>
                Outstanding balances plus your planned income and bills. This is
                a planning view, not an accounting statement.
              </p>
            </div>
            <label>
              Days
              <select
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
              >
                <option value="14">14</option>
                <option value="30">30</option>
                <option value="60">60</option>
                <option value="90">90</option>
              </select>
            </label>
          </div>
          {forecast.rows.map((row) => (
            <div className="owner-cash-row" key={row.date}>
              <span>
                <b>{row.date}</b>
                <small>
                  {row.events.map((event) => event.name).join(" · ")}
                </small>
              </span>
              <span>
                <small>
                  +{money(row.cashIn)} / −{money(row.cashOut)}
                </small>
                <b>{money(row.runningCash)}</b>
              </span>
            </div>
          ))}
          {!forecast.rows.length && (
            <p className="empty-note">No expected movements in this window.</p>
          )}
          <p className={forecast.lowestCash < 0 ? "error" : "hint"}>
            Lowest projected balance: {money(forecast.lowestCash)}
          </p>
        </section>
        <section className="panel planning-form">
          <h2>Add planned cash movement</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              act(
                () =>
                  saveCashPlan(
                    data,
                    Object.fromEntries(new FormData(event.currentTarget)),
                  ),
                "Cash-flow plan saved.",
              );
              event.currentTarget.reset();
            }}
          >
            <label>
              Description
              <input
                name="name"
                placeholder="Rent, market fee, expected catering payment"
                required
              />
            </label>
            <div className="form-row">
              <label>
                Direction
                <select name="direction">
                  <option value="out">Money out</option>
                  <option value="in">Money in</option>
                </select>
              </label>
              <label>
                Amount
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                />
              </label>
              <label>
                Date
                <input name="date" type="date" defaultValue={day} required />
              </label>
            </div>
            <label>
              Category
              <input name="category" placeholder="Rent, equipment, event" />
            </label>
            <button className="primary">
              <Plus size={16} />
              Add to forecast
            </button>
          </form>
          {(data.cashFlowPlans || []).map((event) => (
            <div className="owner-plan-row" key={event.id}>
              <span>
                <b>{event.name}</b>
                <small>
                  {event.date} · {event.direction === "in" ? "in" : "out"} ·{" "}
                  {money(event.amount)}
                </small>
              </span>
              <button
                className="icon-button"
                aria-label={`Remove ${event.name}`}
                onClick={() =>
                  act(
                    () => removeCashPlan(data, event.id),
                    "Cash-flow plan removed.",
                  )
                }
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </section>
      </div>
      <section className="panel owner-bookkeeping">
        <div>
          <h2>Bookkeeping export</h2>
          <p>
            Sales, operating expenses and inventory purchases in one CSV with
            tax and cost columns kept separate.
          </p>
        </div>
        <label>
          Month
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
        <button
          className="secondary"
          disabled={!ledger.length}
          onClick={() => {
            downloadText(
              `bakery-bookkeeping-${month}.csv`,
              bookkeepingCsv(data, month),
            );
          }}
        >
          <Download size={16} />
          Export {ledger.length} entries
        </button>
      </section>
    </>
  );
}

function Tools({ data, navigate }) {
  let backups = [];
  let backupError = "";
  try {
    backups = readBackups(localStorage);
  } catch {
    backupError = "Local backup history needs attention.";
  }
  const latest = backups.at(-1);
  const deviceDay = localStorage.getItem("bakery-ledger-device-backup-day-v1");
  return (
    <div className="owner-decision-grid">
      <section className="panel">
        <h2>Backup health</h2>
        <dl className="snapshot-ledger">
          <dt>Automatic local snapshots</dt>
          <dd>{backups.length}</dd>
          <dt>Latest local snapshot</dt>
          <dd>
            {latest?.savedAt
              ? new Date(latest.savedAt).toLocaleString()
              : "Not yet available"}
          </dd>
          <dt>Latest device backup</dt>
          <dd>{deviceDay || "Not recorded on this device"}</dd>
          <dt>Workspace records</dt>
          <dd>
            {(data.sales || []).length +
              (data.orders || []).length +
              (data.recipes || []).length}
          </dd>
        </dl>
        {backupError && <p className="error">{backupError}</p>}
        <div className="planning-actions">
          <button className="primary" onClick={() => navigate("Backups")}>
            Export portable backup
          </button>
          <button
            className="secondary"
            onClick={() => navigate("Secure backups")}
          >
            Secure backup tools
          </button>
        </div>
      </section>
      <section className="panel">
        <h2>Keyboard-first workflow</h2>
        <div className="shortcut-list">
          <span>
            <kbd>Ctrl/⌘ K</kbd>
            <b>Find a page, record or action</b>
          </span>
          <span>
            <kbd>↑ / ↓</kbd>
            <b>Move through search results</b>
          </span>
          <span>
            <kbd>Enter</kbd>
            <b>Open the selected result</b>
          </span>
          <span>
            <kbd>Esc</kbd>
            <b>Close search or a dialog</b>
          </span>
          <span>
            <kbd>F1</kbd>
            <b>Open the user guide</b>
          </span>
        </div>
        <p className="hint">
          Search includes recipes, stock items, customers, orders, pages and
          common quick actions.
        </p>
      </section>
    </div>
  );
}
