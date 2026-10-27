import React, { useState } from "react";
import {
  localDate,
  inventoryForecast,
  quoteCalculation,
  saveQuote,
  savePlan,
  completePlan,
} from "./planning.js";
import { fullCost } from "./operations.js";

const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
const qty = (n) => Number(n.toFixed(3));
const nextWeek = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

export default function PlanningWorkspace({ data, save, tab, open }) {
  const [error, setError] = useState("");
  function act(fn) {
    try {
      const next = fn();
      if (save(next) === false) return false;
      setError("");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }
  return (
    <div className="planning-workspace">
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {tab === "Inventory dashboard" ? (
        <InventoryDashboard data={data} open={open} />
      ) : tab === "Quotes" ? (
        <QuoteStudio data={data} act={act} />
      ) : (
        <DailyPlanner data={data} act={act} />
      )}
    </div>
  );
}

function InventoryDashboard({ data, open }) {
  const [through, setThrough] = useState(nextWeek),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const forecast = inventoryForecast(data, through || localDate());
  const shortageCount = forecast.items.filter((i) => i.shortage > 1e-9).length;
  const items = forecast.items
    .filter(
      (i) =>
        i.name.toLowerCase().includes(search.toLowerCase()) &&
        (filter === "all" ||
          (filter === "shortage" ? i.shortage > 1e-9 : i.stock <= 0)),
    )
    .sort(
      (a, b) =>
        Number(b.shortage > 1e-9) - Number(a.shortage > 1e-9) ||
        a.name.localeCompare(b.name),
    );
  const value = forecast.items.reduce(
    (n, i) =>
      n +
      (i.stock / i.amount) *
        i.price *
        (i.taxIncluded ? 1 : 1 + (i.tax || 0) / 100),
    0,
  );
  return (
    <>
      <div className="planning-toolbar">
        <div>
          <h2>Stock today. Clarity for the week.</h2>
          <p>
            Combined ingredient and packaging needs from pending production,
            including overdue plans.
          </p>
        </div>
        <label>
          Forecast through
          <input
            type="date"
            value={through}
            onChange={(e) => setThrough(e.target.value)}
            required
          />
        </label>
      </div>
      <div className="stats planning-stats">
        {[
          ["On-hand value", money(value), "At current purchase prices"],
          ["Shortages", shortageCount, "Items to buy for your plan"],
          [
            "Out of stock",
            forecast.items.filter((i) => i.stock <= 0).length,
            "Ingredients and packaging",
          ],
          [
            "Pending production",
            forecast.plans.length,
            "Through selected date",
          ],
        ].map(([title, value, hint]) => (
          <div className="stat" key={title}>
            <div>{title}</div>
            <strong>{value}</strong>
            <small>{hint}</small>
          </div>
        ))}
      </div>
      {forecast.errors.length > 0 && (
        <div className="error" role="alert">
          <b>Forecast incomplete. Fix these plans before relying on totals.</b>
          {forecast.errors.map((e) => (
            <p key={e.id}>{e.message}</p>
          ))}
        </div>
      )}
      <div className="section-top">
        <h2>Inventory forecast</h2>
        <div className="planning-filters">
          <input
            aria-label="Search inventory forecast"
            placeholder="Find an item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label="Inventory status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All items</option>
            <option value="shortage">Shortages</option>
            <option value="empty">Out of stock</option>
          </select>
        </div>
      </div>
      <section className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th>ON HAND</th>
              <th>PLANNED USE</th>
              <th>AFTER PLAN</th>
              <th>BUY</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>
                  <b>{i.name}</b>
                  <small>
                    {i.type === "packaging" ? "Packaging" : "Ingredient"}
                    {i.needsPrice ? " · Price needed" : ""}
                  </small>
                </td>
                <td>
                  {qty(i.stock)} {i.unit}
                </td>
                <td>
                  {qty(i.needed)} {i.unit}
                </td>
                <td>
                  <span className={i.shortage > 1e-9 ? "negative" : "positive"}>
                    {qty(i.remaining)} {i.unit}
                  </span>
                  <small>
                    {i.shortageDate
                      ? "Short on " + i.shortageDate
                      : i.stock <= 0
                        ? "Out of stock"
                        : "Covered"}
                  </small>
                </td>
                <td>
                  {i.packages ? (
                    <>
                      <b>{i.packages} package(s)</b>
                      <small>
                        {qty(i.shortage)} {i.unit} short
                      </small>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <button
                    className="text-button"
                    onClick={() => open("item", data.items.find(item => item.id === i.id))}
                  >
                    Edit item
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!items.length && (
          <div className="empty">
            <h3>No matching items</h3>
            <p>Add inventory or change your filters.</p>
          </div>
        )}
      </section>
      <p className="accounting-note">
        Forecasts share stock across all pending plans. They do not reserve or
        deduct inventory. Receive purchases in Inventory; complete batches in
        Daily planner. Stock value uses current prices and is an estimate.
      </p>
    </>
  );
}

function RecipeSelect({ data, value, onChange }) {
  return (
    <label>
      Dessert / recipe
      <select value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="">Choose a recipe</option>
        {data.recipes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} · {r.yield} portions/batch
          </option>
        ))}
      </select>
    </label>
  );
}
function QuoteStudio({ data, act }) {
  const empty = () => ({
    recipeId: data.recipes[0]?.id || "",
    portions: 1,
    margin: 30,
    extraCost: 0,
    taxRate: 0,
    customer: "",
    notes: "",
    date: localDate(),
  });
  const [form, setForm] = useState(empty),
    [editing, setEditing] = useState(null),
    [notice, setNotice] = useState("");
  const change = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    setNotice("");
  };
  let quote, problem;
  try {
    quote = quoteCalculation(data, form);
  } catch (e) {
    problem = e.message;
  }
  function reset() {
    setForm(empty());
    setEditing(null);
  }
  return (
    <>
      <div className="planning-layout">
        <section className="panel planning-form">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PRICE WITH CONFIDENCE</span>
              <h2>{editing ? "Edit saved quote" : "Quote calculator"}</h2>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (act(() => saveQuote(data, form, editing))) {
                reset();
                setNotice("Quote saved on this device.");
              }
            }}
          >
            <RecipeSelect
              data={data}
              value={form.recipeId}
              onChange={(v) => change("recipeId", v)}
            />
            <label>
              Customer / reference
              <input
                value={form.customer}
                onChange={(e) => change("customer", e.target.value)}
                placeholder="e.g. Emma’s birthday"
              />
            </label>
            <div className="form-row">
              <label>
                Requested portions
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.portions}
                  onChange={(e) => change("portions", e.target.value)}
                  required
                />
              </label>
              <label>
                Target margin (%)
                <input
                  type="number"
                  min="0"
                  max="99.99"
                  step="any"
                  value={form.margin}
                  onChange={(e) => change("margin", e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Additional order cost ($)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.extraCost}
                  onChange={(e) => change("extraCost", e.target.value)}
                  required
                />
              </label>
              <label>
                Quote tax (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={form.taxRate}
                  onChange={(e) => change("taxRate", e.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Quote date
              <input
                type="date"
                value={form.date}
                onChange={(e) => change("date", e.target.value)}
                required
              />
            </label>
            <label>
              Notes
              <textarea
                value={form.notes}
                onChange={(e) => change("notes", e.target.value)}
                placeholder="Delivery, decorations, or special requests"
              />
            </label>
            <p className="hint">
              Costs cover whole batches, labor, electricity, overhead and
              additional order costs. Margin is profit ÷ price before quote tax.
              Extras are costs, not selling fees.
            </p>
            {problem && (
              <p className="error" role="alert">
                {problem}
              </p>
            )}
            <div className="planning-actions">
              <button className="primary" disabled={!quote}>
                Save quote
              </button>
              {editing && (
                <button type="button" className="secondary" onClick={reset}>
                  Cancel edit
                </button>
              )}
            </div>
            {notice && (
              <p className="positive" role="status">
                {notice}
              </p>
            )}
          </form>
        </section>
        <section className="panel quote-preview">
          <span className="pill">LIVE ESTIMATE</span>
          <h2>A price that covers your work.</h2>
          <strong className="quote-total">
            {quote ? money(quote.total) : "—"}
          </strong>
          <p>Customer total, including quote tax</p>
          {quote && (
            <dl>
              <dt>Whole batches</dt>
              <dd>{quote.batches}</dd>
              <dt>Portions produced / requested</dt>
              <dd>
                {quote.producedPortions} / {quote.portions}
              </dd>
              <dt>Full production + extra cost</dt>
              <dd>{money(quote.cost)}</dd>
              <dt>Quote before tax</dt>
              <dd>{money(quote.subtotal)}</dd>
              <dt>Before-tax price / requested portion</dt>
              <dd>{money(quote.unitPrice)}</dd>
              <dt>Quote tax</dt>
              <dd>{money(quote.tax)}</dd>
              <dt>Estimated profit</dt>
              <dd>{money(quote.profit)}</dd>
            </dl>
          )}
          <p className="hint">
            Saving captures this estimate. Later price changes do not rewrite
            saved quotes. Editing and saving recalculates with current costs.
            Quotes do not change stock or sales.
          </p>
        </section>
      </div>
      <div className="section-top">
        <h2>
          Saved quotes <span className="pill">{data.quotes.length}</span>
        </h2>
      </div>
      <div className="recipe-grid">
        {[...data.quotes].reverse().map((q) => (
          <section className="panel saved-quote" key={q.id}>
            <span className="pill">{q.date}</span>
            <h3>{q.customer || "Untitled customer"}</h3>
            <p>
              {q.snapshot.recipeName} · {q.snapshot.portions} portions
            </p>
            <strong>{money(q.snapshot.total)}</strong>
            <p>{q.notes}</p>
            <small>
              Saved cost {money(q.snapshot.cost)} · {q.snapshot.batches}{" "}
              batch(es)
            </small>
            <div className="planning-actions">
              <button
                className="secondary"
                onClick={() => {
                  setForm({ ...q });
                  setEditing(q.id);
                  setNotice("");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Edit & recalculate
              </button>
              <button
                className="text-button"
                onClick={() => {
                  if (confirm("Delete this saved quote?")) {
                    if (
                      act(() => ({
                        ...data,
                        quotes: data.quotes.filter((x) => x.id !== q.id),
                      })) &&
                      editing === q.id
                    )
                      reset();
                  }
                }}
              >
                Delete
              </button>
            </div>
          </section>
        ))}
      </div>
      {!data.quotes.length && (
        <div className="panel empty">
          <h3>Your next order starts here</h3>
          <p>Calculate a price and save the quote for later.</p>
        </div>
      )}
    </>
  );
}

function DailyPlanner({ data, act }) {
  const [day, setDay] = useState(localDate),
    [editing, setEditing] = useState(null),
    [recipeId, setRecipeId] = useState(data.recipes[0]?.id || ""),
    [batches, setBatches] = useState(1),
    [notes, setNotes] = useState("");
  const plans = data.productionPlans.filter((p) => p.date === day);
  const pending = plans.filter((p) => p.status === "planned");
  const forecast = inventoryForecast(data, day || localDate());
  const shortages = forecast.items.filter((i) => i.shortage > 1e-9);
  const portions = pending.reduce(
    (n, p) =>
      n +
      (data.recipes.find((r) => r.id === p.recipeId)?.yield || 0) * p.batches,
    0,
  );
  function reset() {
    setEditing(null);
    setBatches(1);
    setNotes("");
  }
  return (
    <>
      <div className="planning-toolbar">
        <div>
          <h2>A calm start to a busy kitchen.</h2>
          <p>
            Plan whole batches, review shared ingredients, then record completed
            production.
          </p>
        </div>
        <label>
          Production date
          <input
            type="date"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              reset();
            }}
            required
          />
        </label>
      </div>
      <div className="stats planning-stats">
        {[
          ["Pending batches", pending.reduce((n, p) => n + p.batches, 0)],
          ["Planned portions", portions],
          [
            "Completed tasks",
            plans.filter((p) => p.status === "completed").length,
          ],
          ["Items short through this day", shortages.length],
        ].map(([label, n]) => (
          <div className="stat" key={label}>
            <div>{label}</div>
            <strong>{n}</strong>
          </div>
        ))}
      </div>
      <div className="planning-layout">
        <section className="panel planning-form">
          <h2>
            {editing ? "Edit production task" : "Add a dessert to the day"}
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                act(() =>
                  savePlan(
                    data,
                    { date: day, recipeId, batches: +batches, notes },
                    editing,
                  ),
                )
              )
                reset();
            }}
          >
            <RecipeSelect data={data} value={recipeId} onChange={setRecipeId} />
            <label>
              Whole batches
              <input
                type="number"
                min="1"
                step="1"
                value={batches}
                onChange={(e) => setBatches(e.target.value)}
                required
              />
            </label>
            <label>
              Kitchen notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Chill overnight; decorate before pickup"
              />
            </label>
            <div className="planning-actions">
              <button className="primary" disabled={!day || !recipeId}>
                {editing ? "Save task" : "Add to plan"}
              </button>
              {editing && (
                <button className="secondary" type="button" onClick={reset}>
                  Cancel edit
                </button>
              )}
            </div>
          </form>
        </section>
        <section className="panel planning-form">
          <h2>Shopping for your production plan</h2>
          <p className="hint">
            Includes every pending task through {day}, including earlier dates.
            Completing a task consumes stock immediately.
          </p>
          {forecast.errors.map((e) => (
            <p className="error" role="alert" key={e.id}>
              {e.message}
            </p>
          ))}
          {shortages.map((i) => (
            <div className="legend" key={i.id}>
              <span>
                {i.name}
                <small>Short from {i.shortageDate}</small>
              </span>
              <b>
                {i.packages} package(s)
                <small>
                  {qty(i.shortage)} {i.unit} needed
                </small>
              </b>
            </div>
          ))}
          {!shortages.length && !forecast.errors.length && (
            <p className="positive">
              All pending ingredient and packaging needs are covered through
              this day.
            </p>
          )}
        </section>
      </div>
      <div className="section-top">
        <h2>Production for {day}</h2>
        <span className="pill">{plans.length} TASKS</span>
      </div>
      <div className="recipe-grid">
        {plans.map((p) => {
          const r = data.recipes.find((r) => r.id === p.recipeId);
          let cost;
          try {
            cost = fullCost(r, data.items, data.settings) * p.batches;
          } catch {}
          return (
            <section
              className={
                "panel production-task " +
                (p.status === "completed" ? "completed-task" : "")
              }
              key={p.id}
            >
              <span className="pill">
                {p.status === "completed" ? "COMPLETED" : "PLANNED"}
              </span>
              <h3>{r?.name || p.recipeName || "Missing recipe"}</h3>
              <p>
                {p.batches} batch(es) · {p.status === "completed" ? p.producedPortions : r ? p.batches * r.yield : "—"} portions
              </p>
              <p>{p.notes}</p>
              {p.status === "planned" ? (
                <>
                  <small>
                    {cost === undefined
                      ? "Fix recipe conversions to calculate cost"
                      : "Estimated production cost " + money(cost)}
                  </small>
                  <div className="planning-actions">
                    <button
                      className="primary"
                      onClick={() => {
                        if (
                          confirm(
                            "Record these completed batches? This consumes ingredients and adds finished product stock.",
                          )
                        )
                          act(() => completePlan(data, p.id));
                      }}
                    >
                      Complete production
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        setEditing(p.id);
                        setRecipeId(p.recipeId);
                        setBatches(p.batches);
                        setNotes(p.notes || "");
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        if (confirm("Remove this pending task?")) {
                          if (
                            act(() => ({
                              ...data,
                              productionPlans: data.productionPlans.filter(
                                (x) => x.id !== p.id,
                              ),
                            })) &&
                            editing === p.id
                          )
                            reset();
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <p className="positive">
                  Stock updated · {p.completedAt?.slice(0, 10)}
                </p>
              )}
            </section>
          );
        })}
      </div>
      {!plans.length && (
        <div className="panel empty">
          <h3>Room for something sweet</h3>
          <p>Add your first dessert batch for this date.</p>
        </div>
      )}
    </>
  );
}
