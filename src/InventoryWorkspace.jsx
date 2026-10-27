import React, { useState } from "react";
import { addPresets, availability, produce, fullCost } from "./operations.js";
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
export function SaleFields({ data }) {
  const [id, setId] = useState(data.recipes[0]?.id || ""),
    [qty, setQty] = useState(1),
    [discount, setDiscount] = useState(0);
  const r = data.recipes.find((x) => x.id === id),
    stock = data.products[id]?.quantity || 0,
    total = Math.max(0, (r?.price || 0) * qty - discount);
  return (
    <>
      <label>
        Product
        <select
          name="recipe"
          value={id}
          onChange={(e) => setId(e.target.value)}
          required
        >
          {data.recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {data.products[r.id]?.quantity || 0} available
            </option>
          ))}
        </select>
      </label>
      <div className="form-row">
        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            min="1"
            max={stock || 1}
            step="1"
            value={qty}
            onChange={(e) => setQty(+e.target.value)}
            required
          />
        </label>
        <label>
          Discount ($)
          <input
            type="number"
            min="0"
            max={(r?.price || 0) * qty}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(+e.target.value)}
          />
        </label>
      </div>
      <div className="cost-summary">
        <span>
          Unit price <b>{money(r?.price || 0)}</b>
        </span>
        <span>
          Total <b>{money(total)}</b>
        </span>
      </div>
      <input type="hidden" name="total" value={total} />
      <label>
        Customer / order reference
        <input name="customer" placeholder="Optional" />
      </label>
      <div className="form-row">
        <label>
          Date
          <input
            name="date"
            type="date"
            defaultValue={new Date().toLocaleDateString("en-CA")}
            required
          />
        </label>
        <label>
          Payment
          <select name="payment">
            <option>Cash</option>
            <option>Card</option>
            <option>Bank transfer</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <p className="hint">
        {stock} portions available. Recording a sale deducts finished stock and
        uses its production cost. Complete a batch in the production plan before
        selling.
      </p>
    </>
  );
}
export default function Operations({ data, save, open, tab }) {
  const [error, setError] = useState(""),
    [q, setQ] = useState("");
  function act(fn) {
    try {
      const next = fn();
      save(next);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <div className="section-top">
        <h2>
          {tab === "Inventory"
            ? "On-hand inventory"
            : tab === "Cost settings"
              ? "Cost assumptions"
              : "Recipes & finished stock"}
        </h2>
        <input
          placeholder="Search"
          aria-label="Search operations"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {error && <div className="error">{error}</div>}
      {tab === "Inventory" ? (
        <>
          <div className="operations-banner">
            <div>
              <h2>Ingredient & packaging inventory</h2>
              <p>
                Stock uses each item's purchase unit. Receive purchases or count
                stock below. Presets need your actual purchase prices.
              </p>
            </div>
            <button
              className="secondary"
              onClick={() => act(() => addPresets(data))}
            >
              Add common ingredients
            </button>
          </div>
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>ON HAND</th>
                  <th>CONVERSION</th>
                  <th>MANAGE</th>
                </tr>
              </thead>
              <tbody>
                {data.items
                  .filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
                  .map((i) => (
                    <tr key={i.id}>
                      <td>
                        <b>{i.name}</b>
                        <small>
                          {i.needsPrice
                            ? "Purchase price required"
                            : `${money(i.price)} / ${i.amount} ${i.unit}`}
                        </small>
                      </td>
                      <td>
                        <b>
                          {Number((i.stock || 0).toFixed(3))} {i.unit}
                        </b>
                        <small>{!i.stock ? "Out of stock" : ""}</small>
                      </td>
                      <td>
                        {i.gramsPerCan ? `${i.gramsPerCan} g / can · ` : ""}
                        {i.gramsPerCup
                          ? `${i.gramsPerCup} g / US cup`
                          : i.density
                            ? `${i.density} g/ml`
                            : "Same-unit conversions"}
                      </td>
                      <td>
                        <StockForm
                          item={i}
                          apply={(n, kind) =>
                            act(() => ({
                              ...data,
                              items: data.items.map((x) =>
                                x.id === i.id
                                  ? {
                                      ...x,
                                      stock:
                                        kind === "receive"
                                          ? (x.stock || 0) + n
                                          : n,
                                    }
                                  : x,
                              ),
                              movements: [
                                ...data.movements,
                                {
                                  id: crypto.randomUUID(),
                                  date: new Date().toISOString(),
                                  name: i.name,
                                  kind,
                                  quantity: n,
                                  unit: i.unit,
                                },
                              ],
                            }))
                          }
                        />
                        <button
                          className="text-button"
                          onClick={() => open("item", i)}
                        >
                          Edit price & conversion
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <section className="panel" style={{ marginTop: 20 }}>
            <div className="panel-heading">
              <h2>Recent stock activity</h2>
            </div>
            {data.movements
              .slice(-15)
              .reverse()
              .map((m) => (
                <div className="legend" key={m.id}>
                  <span>
                    {m.kind} · {m.name}
                  </span>
                  <b>
                    {m.quantity} {m.unit || "portions"} · {m.date.slice(0, 10)}
                  </b>
                </div>
              ))}
            {!data.movements.length && (
              <p className="accounting-note">No stock movements yet.</p>
            )}
          </section>
        </>
      ) : tab === "Cost settings" ? (
        <section className="panel operations-settings">
          <h2>Labor & operating cost assumptions</h2>
          <p>
            Used for future production. Existing finished stock and sales retain
            their captured cost.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.target));
              act(() => ({
                ...data,
                settings: {
                  hourlyWage: +f.hourlyWage,
                  electricityRate: +f.electricityRate,
                },
              }));
            }}
          >
            <label>
              Hourly wage ($/hour)
              <input
                name="hourlyWage"
                type="number"
                min="0"
                step="0.01"
                defaultValue={data.settings.hourlyWage}
                required
              />
            </label>
            <label>
              Electricity rate ($/kWh)
              <input
                name="electricityRate"
                type="number"
                min="0"
                step="0.001"
                defaultValue={data.settings.electricityRate}
                required
              />
            </label>
            <button className="primary">Save cost settings</button>
          </form>
          <p>
            Enter labor minutes, electricity kWh, and other allocated overhead
            per batch in each recipe. Estimate electricity as appliance kW ×
            hours used. Record only additional, unallocated costs as expenses to
            avoid counting the same wages or utilities twice.
          </p>
          <p>
            These are internal cost estimates, not payroll or tax calculations.
          </p>
        </section>
      ) : (
        <div className="recipe-grid">
          {data.recipes
            .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
            .map((r) => {
              const a = availability(r, data.items),
                stock = data.products[r.id] || { quantity: 0, value: 0 };
              let cost;
              try {
                cost = fullCost(r, data.items, data.settings);
              } catch {}
              return (
                <section className="panel recipe-card" key={r.id}>
                  <span className="pill">{r.category}</span>
                  <h3>{r.name}</h3>
                  <dl>
                    <dt>Finished portions available</dt>
                    <dd>{stock.quantity}</dd>
                    <dt>Batches you can make</dt>
                    <dd>{a.batches}</dd>
                    <dt>Potential portions</dt>
                    <dd>{a.portions}</dd>
                    <dt>Full batch cost</dt>
                    <dd>
                      {cost === undefined ? "Needs conversion" : money(cost)}
                    </dd>
                    <dt>Labor / electricity / overhead</dt>
                    <dd>
                      {money(
                        ((r.laborMinutes || 0) / 60) * data.settings.hourlyWage,
                      )}{" "}
                      /{" "}
                      {money(
                        (r.electricityKwh || 0) * data.settings.electricityRate,
                      )}{" "}
                      / {money(r.overheadPerBatch || 0)}
                    </dd>
                    <dt>Full cost per portion</dt>
                    <dd>{cost === undefined ? "—" : money(cost / r.yield)}</dd>
                    <dt>Stock value</dt>
                    <dd>{money(stock.value)}</dd>
                  </dl>
                  {a.error && <div className="error">{a.error}</div>}
                  {tab === "Can make" && (
                    <div className="requirements">
                      {Object.entries(a.needs || {}).map(([id, n]) => {
                        const i = data.items.find((x) => x.id === id);
                        return (
                          <p
                            key={id}
                            className={(i.stock || 0) < n ? "negative" : ""}
                          >
                            {i.name}: {Number(n.toFixed(3))} {i.unit} needed /{" "}
                            {Number((i.stock || 0).toFixed(3))} available
                          </p>
                        );
                      })}
                    </div>
                  )}
                  <form
                    className="production-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.target);
                      act(() => produce(data, r.id, +f.get("batches")));
                    }}
                  >
                    <input
                      aria-label={`Batches of ${r.name}`}
                      name="batches"
                      type="number"
                      min="1"
                      max={a.batches || 1}
                      step="1"
                      defaultValue="1"
                      required
                    />
                    <button className="primary" disabled={!a.batches}>
                      Record production
                    </button>
                  </form>
                  <button
                    className="text-button"
                    onClick={() => open("recipe", r)}
                  >
                    Edit recipe & batch costs
                  </button>
                </section>
              );
            })}
          {!data.recipes.length && (
            <p>Create a recipe first to plan production.</p>
          )}
        </div>
      )}
    </>
  );
}
function StockForm({ item, apply }) {
  const [n, setN] = useState(""),
    [kind, setKind] = useState("receive");
  return (
    <form
      className="stock-form"
      onSubmit={(e) => {
        e.preventDefault();
        apply(kind === "receive" ? +n * item.amount : +n, kind);
        setN("");
      }}
    >
      <select
        aria-label="Stock action"
        value={kind}
        onChange={(e) => setKind(e.target.value)}
      >
        <option value="receive">Receive packages</option>
        <option value="count">Set on-hand quantity</option>
      </select>
      <input
        aria-label={`Stock quantity for ${item.name}`}
        type="number"
        min="0"
        step="any"
        value={n}
        onChange={(e) => setN(e.target.value)}
        placeholder={kind === "receive" ? "Packages" : item.unit}
        required
      />
      <button className="secondary" type="submit">
        Save
      </button>
      <input hidden readOnly value="" />
      {/* Package receipts are converted to purchase units. */}
    </form>
  );
}
