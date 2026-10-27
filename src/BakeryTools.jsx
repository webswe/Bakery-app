import React, { useState } from "react";
import {
  createOrder,
  updateOrder,
  shoppingList,
  stockAlerts,
  recordWaste,
  scaleRecipe,
} from "./business.js";
import { localDate } from "./planning.js";
import { readBackups } from "./backupStorage.js";
import { migrateData } from "./analytics.js";
import { orderPaid } from "./ownerOps.js";
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
const qty = (n) => Number(n.toFixed(3));
function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export default function BakeryTools({
  data,
  save,
  page,
  open,
  navigate,
  context = {},
  restore,
}) {
  const [error, setError] = useState("");
  function act(fn, restoring = false) {
    try {
      if (save(fn(), restoring) === false) return false;
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
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {page === "Orders" ? (
        <Orders
          data={data}
          act={act}
          navigate={navigate}
          quoteId={context.quoteId}
        />
      ) : page === "Shopping list" ? (
        <Shopping data={data} />
      ) : page === "Waste & expiry" ? (
        <Waste data={data} act={act} open={open} />
      ) : page === "Recipe scaling" ? (
        <Scaling data={data} />
      ) : (
        <Backups data={data} act={act} restore={restore} />
      )}
    </div>
  );
}
function Orders({ data, act, navigate, quoteId: initialQuoteId }) {
  const [quoteId, setQuote] = useState(
      data.quotes.some((q) => q.id === initialQuoteId) ? initialQuoteId : "",
    ),
    [pickupDate, setDate] = useState(localDate),
    [deposit, setDeposit] = useState(0),
    [accepted, setAccepted] = useState(false);
  return (
    <>
      <section className="panel planning-form">
        <h2>From quote to pickup</h2>
        <p>
          Accept a saved quote and create a linked production task. Deposits
          track money received; revenue is recorded once, when fulfilled. Quote
          totals retain the saved quote tax. New orders carry that breakdown
          into the sale; historical orders keep their original totals.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              act(() => createOrder(data, { quoteId, pickupDate, deposit }))
            ) {
              setDeposit(0);
              setAccepted(true);
            }
          }}
        >
          <label>
            Saved quote
            <select
              required
              value={quoteId}
              onChange={(e) => setQuote(e.target.value)}
            >
              <option value="">Choose a quote</option>
              {data.quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.customer || "Customer"} · {q.snapshot.recipeName} ·{" "}
                  {money(q.snapshot.total)}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Pickup date
              <input
                required
                type="date"
                value={pickupDate}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Deposit received ($)
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
              />
            </label>
          </div>
          <button className="primary">Accept quote & plan production</button>
        </form>
      </section>
      {accepted && (
        <p className="positive" role="status">
          Order accepted. Its production task is ready in the production plan.
        </p>
      )}
      <div className="planning-actions">
        <button className="secondary" onClick={() => navigate("Quotes")}>
          Calculate a new quote
        </button>
        <button className="secondary" onClick={() => navigate("Daily planner")}>
          View linked production tasks
        </button>
      </div>
      <div className="section-top">
        <h2>Customer orders</h2>
      </div>
      <div className="recipe-grid">
        {[...data.orders].reverse().map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            act={act}
            data={data}
            navigate={navigate}
          />
        ))}
      </div>
      {!data.orders.length && (
        <p className="panel empty">
          Save a quote, then accept it here to start an order.
        </p>
      )}
    </>
  );
}
function OrderCard({ order: o, act, data, navigate }) {
  const [day, setDay] = useState(o.pickupDate);
  const paid = orderPaid(data, o);
  return (
    <section className="panel saved-quote">
      <span className="pill">{o.status}</span>
      <h3>{o.customer || "Customer order"}</h3>
      <p>
        {o.recipeName} · {o.portions} portions · Pickup {o.pickupDate}
      </p>
      <p>{o.notes}</p>
      <dl>
        {o.taxSnapshot && (
          <>
            <dt>Before sales tax</dt>
            <dd>{money(o.taxSnapshot.net)}</dd>
            <dt>Customer sales tax</dt>
            <dd>{money(o.taxSnapshot.tax)}</dd>
          </>
        )}
        <dt>Order total</dt>
        <dd>{money(o.total)}</dd>
        <dt>Received</dt>
        <dd>{money(paid)}</dd>
        <dt>Balance due</dt>
        <dd>{money(o.total - paid)}</dd>
      </dl>
      {o.status === "open" && (
        <>
          <button className="secondary" onClick={() => navigate("Payments")}>
            Record payment or refund
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(() =>
                updateOrder(data, o.id, "reschedule", { pickupDate: day }),
              );
            }}
          >
            <label>
              New pickup date
              <input
                required
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
            <button className="secondary">Reschedule</button>
          </form>
          <div className="planning-actions">
            <button
              className="primary"
              onClick={() => {
                if (
                  confirm(
                    "Fulfill this paid order? Finished stock will be deducted and one sale recorded.",
                  )
                )
                  act(() => updateOrder(data, o.id, "fulfill"));
              }}
            >
              Fulfill order
            </button>
            <button
              className="text-button"
              onClick={() => {
                if (
                  confirm(
                    "Cancel this order and remove pending tasks? Completed stock stays available. Reconcile any deposit refund separately; payment history is retained.",
                  )
                )
                  act(() => updateOrder(data, o.id, "cancel"));
              }}
            >
              Cancel order
            </button>
          </div>
        </>
      )}
    </section>
  );
}
function Shopping({ data }) {
  const [day, setDay] = useState(localDate),
    [checked, setChecked] = useState({});
  const list = shoppingList(data, day || localDate());
  const suppliers = [...new Set(list.rows.map((i) => i.supplier))].sort();
  const csv = () => {
    const cell = (v) => '"' + String(v).replaceAll('"', '""') + '"';
    download(
      "bakery-shopping-" + day + ".csv",
      [
        ["Supplier", "Item", "Packages", "Quantity", "Unit", "Estimated cost"],
        ...list.rows.map((i) => [
          i.supplier,
          i.name,
          i.packages,
          i.buyQuantity,
          i.unit,
          i.estimate ?? "Price needed",
        ]),
      ]
        .map((r) => r.map(cell).join(","))
        .join("\r\n"),
      "text/csv",
    );
  };
  return (
    <>
      <div className="planning-toolbar">
        <div>
          <h2>Your supplier shopping list</h2>
          <p>
            Buy enough for pending batches and to keep your minimum stock after
            production. Marking a row does not receive inventory.
          </p>
        </div>
        <label>
          Shopping through
          <input
            type="date"
            required
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setChecked({});
            }}
          />
        </label>
      </div>
      {list.errors.map((e) => (
        <p className="error" key={e.id}>
          Incomplete forecast: {e.message}
        </p>
      ))}
      <div className="planning-actions no-print">
        <button className="secondary" onClick={csv}>
          Export CSV
        </button>
        <button className="secondary" onClick={() => window.print()}>
          Print list
        </button>
      </div>
      <h3>
        Estimated total:{" "}
        {money(list.rows.reduce((n, i) => n + (i.estimate || 0), 0))}
        {list.rows.some((i) => i.estimate === null) ? " + unpriced items" : ""}
      </h3>
      {suppliers.map((s) => (
        <section className="panel planning-form" key={s}>
          <h2>{s}</h2>
          {list.rows
            .filter((i) => i.supplier === s)
            .map((i) => (
              <div className="legend" key={i.id}>
                <label className="shopping-check">
                  <input
                    type="checkbox"
                    checked={!!checked[i.id]}
                    onChange={() =>
                      setChecked({ ...checked, [i.id]: !checked[i.id] })
                    }
                  />
                  <span>
                    {i.name}
                    <small>
                      {i.packages} package(s) · {qty(i.buyQuantity)} {i.unit}
                    </small>
                  </span>
                </label>
                <b>
                  {i.estimate === null ? "Price needed" : money(i.estimate)}
                </b>
              </div>
            ))}
        </section>
      ))}
      {!list.rows.length && (
        <p className="panel empty">
          Stock covers your production plans and minimum levels through this
          date.
        </p>
      )}
    </>
  );
}
function Waste({ data, act, open }) {
  const [kind, setKind] = useState("ingredient"),
    [id, setId] = useState(""),
    [amount, setAmount] = useState(""),
    [day, setDay] = useState(localDate),
    [reason, setReason] = useState("Spoilage");
  const alerts = stockAlerts(data),
    items = kind === "ingredient" ? data.items : data.recipes;
  return (
    <>
      <section className="panel planning-form">
        <h2>Low stock & expiry alerts</h2>
        <p>
          Set supplier, minimum stock and expiry in each item's details. Expiry
          is for current stock, not individual lots.
        </p>
        {alerts.map((i) => (
          <div className="legend" key={i.id}>
            <span>
              {i.name}
              <small>
                {qty(i.stock || 0)} {i.unit} on hand · minimum {i.minStock || 0}
                {i.expiryDate ? " · expires " + i.expiryDate : ""}
              </small>
            </span>
            <button className="secondary" onClick={() => open("item", i)}>
              Edit stock settings
            </button>
          </div>
        ))}
        {!alerts.length && (
          <p className="positive">No low-stock or expired-stock alerts.</p>
        )}
        <h3>Upcoming expiry</h3>
        {data.items
          .filter(
            (i) => i.stock > 0 && i.expiryDate && i.expiryDate > localDate(),
          )
          .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
          .map((i) => (
            <p key={i.id}>
              {i.name} · {i.expiryDate}
            </p>
          ))}
      </section>
      <section className="panel planning-form">
        <h2>Record spoilage or unsold desserts</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              act(() =>
                recordWaste(data, {
                  kind,
                  itemId: id,
                  amount,
                  date: day,
                  reason,
                }),
              )
            )
              setAmount("");
          }}
        >
          <label>
            Waste type
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setId("");
              }}
            >
              <option value="ingredient">Ingredient / packaging</option>
              <option value="product">Finished dessert</option>
            </select>
          </label>
          <label>
            Stock item
            <select required value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">Choose stock</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ·{" "}
                  {kind === "ingredient"
                    ? (i.stock || 0) + " " + i.unit
                    : (data.products[i.id]?.quantity || 0) + " portions"}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Waste quantity
              <input
                required
                type="number"
                min="0.001"
                step={kind === "product" ? "1" : "any"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Waste date
              <input
                required
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </label>
          </div>
          <label>
            Reason
            <input
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <p className="hint">
            Deducts stock and records its cost as a waste expense. Ingredient
            cost uses current purchase prices; desserts use captured average
            production cost. Historical waste is retained.
          </p>
          <button className="primary">Record waste</button>
        </form>
      </section>
      <section className="panel planning-form">
        <h2>
          Waste history · {money(data.waste.reduce((n, w) => n + w.cost, 0))}
        </h2>
        {[...data.waste].reverse().map((w) => (
          <div className="legend" key={w.id}>
            <span>
              {w.name}
              <small>
                {w.date} · {w.amount} {w.unit} · {w.reason}
              </small>
            </span>
            <b>{money(w.cost)}</b>
          </div>
        ))}
      </section>
    </>
  );
}
function Scaling({ data }) {
  const [id, setId] = useState(data.recipes[0]?.id || ""),
    [target, setTarget] = useState(12);
  let scaled, error;
  try {
    scaled = scaleRecipe(data, id, target);
  } catch (e) {
    error = e.message;
  }
  return (
    <section className="panel planning-form">
      <h2>Scale a recipe to your portions</h2>
      <p>
        This is an exact proportional preview, including packaging, labor and
        allocated overhead. Round indivisible eggs or packaging as needed and
        verify baking time. Saved recipes and stock stay unchanged.
      </p>
      <label>
        Recipe to scale
        <select value={id} onChange={(e) => setId(e.target.value)}>
          {data.recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.yield} portions
            </option>
          ))}
        </select>
      </label>
      <label>
        Target portions
        <input
          type="number"
          min="1"
          step="1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </label>
      {error ? (
        <p className="error">{error}</p>
      ) : (
        <>
          <h3>
            {scaled.factor.toFixed(3)} × recipe · estimated cost{" "}
            {money(scaled.cost)}
          </h3>
          {scaled.lines.map((l, n) => (
            <div className="legend" key={n}>
              <span>{data.items.find((i) => i.id === l.itemId)?.name}</span>
              <b>
                {qty(l.amount)} {l.unit}
              </b>
            </div>
          ))}
          <p>
            Labor {qty(scaled.laborMinutes)} min · Electricity{" "}
            {qty(scaled.electricityKwh)} kWh · Other overhead{" "}
            {money(scaled.overheadPerBatch)}
          </p>
          <button className="secondary no-print" onClick={() => window.print()}>
            Print scaled recipe
          </button>
        </>
      )}
    </section>
  );
}
function Backups({ data, act, restore }) {
  let history = [],
    problem;
  try {
    history = readBackups(localStorage);
  } catch (e) {
    problem = e.message;
  }
  return (
    <section className="panel planning-form">
      <h2>Automatic daily backups</h2>
      <p>
        Before the first save each day, the app keeps the prior saved workspace.
        Up to 14 dated snapshots stay on this device. Clearing browser storage
        removes these too; download JSON copies for an independent backup.
      </p>
      <button
        className="primary"
        onClick={() =>
          download(
            "bakery-ledger-" + localDate() + ".json",
            JSON.stringify(data, null, 2),
          )
        }
      >
        Download current workspace
      </button>
      <label className="restore-file">
        Restore a JSON backup
        <input type="file" accept="application/json" onChange={restore} />
        <small>
          Choose a downloaded workspace. You will confirm before replacing
          current records.
        </small>
      </label>
      {problem && <p className="error">{problem}</p>}
      {localStorage.getItem("bakery-ledger-unreadable-v1") && (
        <button
          className="secondary"
          onClick={() =>
            download(
              "bakery-ledger-original-unreadable.txt",
              localStorage.getItem("bakery-ledger-unreadable-v1"),
              "text/plain",
            )
          }
        >
          Download preserved unreadable data
        </button>
      )}
      {[...history].reverse().map((b) => (
        <div className="legend" key={b.day}>
          <span>
            Before changes on {b.day}
            <small>{b.savedAt}</small>
          </span>
          <div className="planning-actions">
            <button
              className="secondary"
              onClick={() =>
                download(
                  "bakery-ledger-backup-" + b.day + ".json",
                  JSON.stringify(b.data, null, 2),
                )
              }
            >
              Download snapshot
            </button>
            <button
              className="secondary"
              onClick={() => {
                if (
                  confirm(
                    "Restore this dated snapshot? Current records will be replaced. Export the current workspace first if you need it.",
                  )
                )
                  act(() => migrateData(b.data), true);
              }}
            >
              Restore snapshot
            </button>
          </div>
        </div>
      ))}
      {!history.length && (
        <p>
          No snapshots yet. The next change to an already saved workspace
          creates the first one.
        </p>
      )}
    </section>
  );
}
