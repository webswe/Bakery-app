import React, { useMemo, useState } from "react";
import { localDate } from "./planning.js";
import {
  dailySnapshot,
  expiryRecipeSuggestions,
  packingSteps,
  recordActualYield,
  removeSeasonalPlan,
  saveSeasonalPlan,
  seasonalPlanCost,
  togglePackingStep,
} from "./ownerFeatures.js";

const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const qty = (value) => Number((value || 0).toFixed(2));

export default function OwnerEnhancements({ data, save, page, navigate }) {
  const [error, setError] = useState("");
  const act = (operation) => {
    try {
      if (save(operation()) === false) return false;
      setError("");
      return true;
    } catch (problem) {
      setError(problem.message);
      return false;
    }
  };
  return (
    <div className="planning-workspace owner-enhancements">
      {error && <p className="error" role="alert">{error}</p>}
      {page === "Daily snapshot" ? (
        <DailySnapshot data={data} />
      ) : page === "Use soon" ? (
        <UseSoon data={data} navigate={navigate} />
      ) : page === "Packing" ? (
        <Packing data={data} act={act} />
      ) : page === "Batch yields" ? (
        <BatchYields data={data} act={act} />
      ) : (
        <SeasonalPlans data={data} act={act} navigate={navigate} />
      )}
    </div>
  );
}

function DailySnapshot({ data }) {
  const [date, setDate] = useState(localDate());
  const snapshot = useMemo(() => dailySnapshot(data, date), [data, date]);
  const metrics = [
    ["Sales revenue", money(snapshot.revenue)],
    ["Net profit", money(snapshot.profit)],
    ["Cash received", money(snapshot.cashReceived)],
    ["Sales tax collected", money(snapshot.tax)],
    ["Portions sold", snapshot.portions],
    ["Batches produced", snapshot.batches.reduce((sum, batch) => sum + batch.batches, 0)],
  ];
  return (
    <>
      <div className="planning-toolbar">
        <div><h2>Daily owner snapshot</h2><p>Sales, costs, cash and kitchen output for one working day.</p></div>
        <label>Day<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      </div>
      <div className="stats planning-stats">
        {metrics.map(([label, value]) => <div className="stat" key={label}><div>{label}</div><strong>{value}</strong></div>)}
      </div>
      <div className="planning-layout">
        <section className="panel"><h2>Profit bridge</h2><dl className="snapshot-ledger"><dt>Sales revenue</dt><dd>{money(snapshot.revenue)}</dd><dt>Production cost sold</dt><dd>− {money(snapshot.productionCost)}</dd><dt>Operating expenses</dt><dd>− {money(snapshot.operatingCost)}</dd><dt>Net profit</dt><dd><b>{money(snapshot.profit)}</b></dd></dl></section>
        <section className="panel"><h2>Activity</h2><p>{snapshot.sales.length} sale(s), {snapshot.payments.length} payment entry/entries, {snapshot.expenses.length} expense(s), and {snapshot.batches.length} completed production record(s).</p><p className="hint">Cash received can differ from revenue because deposits may arrive before an order is fulfilled.</p></section>
      </div>
    </>
  );
}

function UseSoon({ data, navigate }) {
  const [date, setDate] = useState(localDate());
  const result = useMemo(() => expiryRecipeSuggestions(data, date), [data, date]);
  return (
    <>
      <div className="planning-toolbar"><div><h2>Use-soon kitchen plan</h2><p>Turn ingredients nearing expiry into sellable products before they become waste.</p></div><label>Start date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label></div>
      <section className="panel planning-form">
        <h2>Lots expiring through {result.end}</h2>
        {result.expiring.map((lot) => { const item = data.items.find((row) => row.id === lot.itemId); return <div className="legend" key={lot.id}><span><b>{item?.name || "Removed item"}</b><small>{lot.supplier || "Supplier not recorded"} · expires {lot.expiryDate}</small></span><b>{qty(lot.remaining)} {lot.unit}</b></div>; })}
        {!result.expiring.length && <p className="positive">No tracked lots expire in the next 14 days.</p>}
      </section>
      {!!result.recipes.length && <section className="panel planning-form"><h2>Recipes that use these lots</h2>{result.recipes.map(({ recipe, matches }) => <div className="legend" key={recipe.id}><span><b>{recipe.name}</b><small>Uses {matches.map((item) => item.name).join(", ")}</small></span><button className="secondary" onClick={() => navigate("Daily planner")}>Plan batch</button></div>)}</section>}
    </>
  );
}

function Packing({ data, act }) {
  const orders = data.orders.filter((order) => order.status === "open").sort((a, b) => a.pickupDate.localeCompare(b.pickupDate));
  return (
    <>
      <div className="planning-toolbar"><div><h2>Order packing board</h2><p>Finish the same checks for every customer pickup.</p></div><span className="pill">{orders.length} OPEN</span></div>
      <div className="recipe-grid packing-grid">
        {orders.map((order) => { const done = new Set(order.packingChecklist || []); return <article className="panel packing-card" key={order.id}><header><span className="pill">Pickup {order.pickupDate}</span><h2>{order.customer || "Customer order"}</h2><p>{order.recipeName} · {order.portions} portions</p></header><div className="packing-progress"><i style={{ width: `${(done.size / packingSteps.length) * 100}%` }} /></div>{packingSteps.map((step) => <label className="check-row" key={step}><input type="checkbox" checked={done.has(step)} onChange={() => act(() => togglePackingStep(data, order.id, step))} /><span>{step}</span></label>)}<p className={done.size === packingSteps.length ? "positive" : "hint"}>{done.size} of {packingSteps.length} checks complete</p></article>; })}
      </div>
      {!orders.length && <p className="panel empty">No open orders need packing.</p>}
    </>
  );
}

function BatchYields({ data, act }) {
  const [values, setValues] = useState({});
  const batches = [...data.productionBatches].reverse().slice(0, 60);
  return (
    <>
      <div className="planning-toolbar"><div><h2>Actual batch yields</h2><p>Compare planned portions with what the kitchen really produced.</p></div></div>
      <section className="panel table-scroll"><table><thead><tr><th>BATCH</th><th>PLANNED</th><th>ACTUAL</th><th>VARIANCE</th><th>NOTE</th><th></th></tr></thead><tbody>{batches.map((batch) => { const draft = values[batch.id] || {}; const actual = batch.actualYield; const variance = actual == null ? null : actual - batch.quantity; return <tr key={batch.id}><td><b>{batch.recipeName}</b><small>{batch.batchCode} · {batch.producedAt}</small></td><td>{qty(batch.quantity)}</td><td><input aria-label={`Actual yield for ${batch.batchCode}`} type="number" min="0.01" step="any" value={draft.actual ?? actual ?? ""} onChange={(event) => setValues({ ...values, [batch.id]: { ...draft, actual: event.target.value } })} /></td><td className={variance < 0 ? "negative" : ""}>{variance == null ? "—" : `${variance > 0 ? "+" : ""}${qty(variance)}`}</td><td><input aria-label={`Yield note for ${batch.batchCode}`} value={draft.note ?? batch.yieldNote ?? ""} onChange={(event) => setValues({ ...values, [batch.id]: { ...draft, note: event.target.value } })} placeholder="Breakage, trim, overfill…" /></td><td><button className="secondary" onClick={() => act(() => recordActualYield(data, batch.id, draft.actual ?? actual, draft.note ?? batch.yieldNote))}>Save</button></td></tr>; })}</tbody></table></section>
      {!batches.length && <p className="panel empty">Complete production to begin tracking actual yields.</p>}
    </>
  );
}

function SeasonalPlans({ data, act, navigate }) {
  const [editing, setEditing] = useState(null);
  const selected = data.seasonalPlans.find((plan) => plan.id === editing);
  const submit = (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    if (act(() => saveSeasonalPlan(data, form, editing))) { setEditing(null); event.currentTarget.reset(); }
  };
  return (
    <div className="planning-layout seasonal-layout">
      <section className="panel planning-form"><h2>{selected ? "Edit seasonal target" : "Add seasonal target"}</h2><p>Save holiday menus and portion goals before building the detailed daily plan.</p><form key={selected?.id || "new"} onSubmit={submit}><label>Season or event<input name="title" defaultValue={selected?.title || ""} placeholder="Holiday market, Mother’s Day…" required /></label><div className="form-row"><label>Start<input name="startDate" type="date" defaultValue={selected?.startDate || localDate()} required /></label><label>End<input name="endDate" type="date" defaultValue={selected?.endDate || localDate()} required /></label></div><label>Menu item<select name="recipeId" defaultValue={selected?.recipeId || ""} required><option value="">Choose recipe</option>{data.recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name}</option>)}</select></label><label>Target portions<input name="targetPortions" type="number" min="1" step="1" defaultValue={selected?.targetPortions || ""} required /></label><label>Notes<textarea name="notes" defaultValue={selected?.notes || ""} placeholder="Packaging, preorder deadline, display notes…" /></label><div className="planning-actions"><button className="primary">Save target</button>{selected && <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>}</div></form></section>
      <section><div className="section-top"><h2>Saved seasons</h2><button className="secondary" onClick={() => navigate("Daily planner")}>Open daily planner</button></div><div className="customer-list">{[...data.seasonalPlans].sort((a, b) => a.startDate.localeCompare(b.startDate)).map((plan) => { const cost = seasonalPlanCost(data, plan); return <article className="panel" key={plan.id}><span className="pill">{plan.startDate} → {plan.endDate}</span><h3>{plan.title}</h3><p>{plan.recipeName} · {plan.targetPortions} portions · {plan.batches} batch(es)</p><p>{plan.notes}</p><dl><dt>Estimated production cost</dt><dd>{cost == null ? "Needs complete recipe costs" : money(cost)}</dd></dl><div className="planning-actions"><button className="secondary" onClick={() => setEditing(plan.id)}>Edit</button><button className="text-button" onClick={() => { if (confirm("Delete this seasonal target?")) act(() => removeSeasonalPlan(data, plan.id)); }}>Delete</button></div></article>; })}{!data.seasonalPlans.length && <p className="panel empty">Add your first holiday, market, or event target.</p>}</div></section>
    </div>
  );
}
