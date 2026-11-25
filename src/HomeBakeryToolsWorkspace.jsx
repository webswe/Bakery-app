import React, { useState } from "react";
import { localDay, money } from "./uiFormatters.js";
import {
  applyMenuPrice,
  assignPickupSlot,
  checkOrderFit,
  pickupConfirmation,
  pickupReservations,
  previewMenuPrice,
  promoteTestBatch,
  recordTestBatch,
  removePickupSlot,
  savePickupSlot,
} from "./homeBakeryTools.js";

export default function HomeBakeryToolsWorkspace({ page, data, save, navigate, orderId }) {
  const [feedback, setFeedback] = useState({ text: "", error: false });

  const act = (makeData, message) => {
    try {
      if (!save(makeData())) {
        setFeedback({ text: "Could not save this change.", error: true });
        return false;
      }
      setFeedback({ text: message, error: false });
      return true;
    } catch (error) {
      setFeedback({ text: error.message, error: true });
      return false;
    }
  };

  return (
    <>
      {feedback.text && (
        <p className={feedback.error ? "error" : "hint"} role={feedback.error ? "alert" : "status"}>
          {feedback.text}
        </p>
      )}
      {page === "Order fit" ? (
        <OrderFit data={data} navigate={navigate} />
      ) : page === "Test batches" ? (
        <TestBatches data={data} act={act} />
      ) : page === "Pickup windows" ? (
        <PickupWindows data={data} act={act} navigate={navigate} initialOrderId={orderId} />
      ) : (
        <PricePreview data={data} act={act} navigate={navigate} />
      )}
    </>
  );
}

function RecipeField({ recipes, label = "Recipe", ...props }) {
  return (
    <label>
      {label}
      <select name="recipeId" required {...props}>
        <option value="">Choose a recipe</option>
        {recipes.map((recipe) => (
          <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
        ))}
      </select>
    </label>
  );
}

function NumberField({ label, name, min = 0, step = "1", ...props }) {
  return (
    <label>
      {label}
      <input name={name} type="number" min={min} step={step} required {...props} />
    </label>
  );
}

function OrderFit({ data, navigate }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const today = localDay();

  return (
    <div className="planning-layout">
      <section className="panel planning-form">
        <h2>Check a request</h2>
        <form
          onChange={() => { setResult(null); setError(""); }}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const input = Object.fromEntries(new FormData(event.currentTarget));
              setResult({ ...checkOrderFit(data, input, today), pickup: input.pickup });
              setError("");
            } catch (error) {
              setResult(null);
              setError(error.message);
            }
          }}
        >
          <RecipeField recipes={data.recipes} />
          <div className="form-row">
            <NumberField name="portions" label="Dessert portions" min="1" defaultValue="1" />
            <label>
              Pickup date
              <input name="pickup" type="date" min={today} defaultValue={today} required />
            </label>
          </div>
          <button className="primary">Check order</button>
        </form>
      </section>
      <section className="panel quote-preview" aria-live="polite">
        <h2>Stock and schedule</h2>
        <p className="hint">
          Estimates a fresh bake on pickup day using stock on hand and planned
          batches. Check cooling and decorating time before promising a pickup hour.
        </p>
        {error && <p className="error">{error}</p>}
        {result && (
          <>
            <p><strong>{result.fits ? "Fits the current plan" : "Needs review"} · {result.batches} batch(es)</strong></p>
            {!result.hasTiming && <p>Add prep or labor time and oven time to the recipe to check capacity.</p>}
            {result.overloaded.length > 0 && (
              <p>Over capacity on {result.pickup}: {result.overloaded.join(", ")}.</p>
            )}
            {result.shortages.length > 0 && (
              <ul>
                {result.shortages.map((item) => (
                  <li key={item.id}>
                    {item.name}: {Number(item.shortage.toFixed(3))} {item.unit} short
                    {item.packages > 0 && ` · ${item.packages} package(s) to buy`}
                  </li>
                ))}
              </ul>
            )}
            {result.errors.length > 0 && (
              <p className="error">Forecast needs review: {result.errors[0].message}</p>
            )}
            <p>{result.earliest ? `Earliest estimated bake and pickup day: ${result.earliest}.` : "No confirmed fit in the next 30 days using current stock and recipe timing."}</p>
            <button className="secondary" onClick={() => navigate(result.fits ? "Quotes" : "Daily planner")}>
              {result.fits ? "Open quotes" : "Review production plan"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}

function TestBatches({ data, act }) {
  const trials = [...(data.recipeTrials || [])].reverse();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [target, setTarget] = useState("");
  const first = trials.find((trial) => trial.id === left) || trials[0];
  const second = trials.find((trial) => trial.id === right) || trials[1];

  function trialField(label, trial, onChange) {
    return (
      <label>
        {label}
        <select value={trial?.id || ""} onChange={(event) => onChange(event.target.value)}>
          <option value="" disabled>Choose a saved batch</option>
          {trials.map((entry) => (
            <option key={entry.id} value={entry.id}>{entry.label} · {entry.date}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="planning-layout">
      <section className="panel planning-form">
        <h2>Record a test batch</h2>
        <p className="hint">Save the recipe version you baked with actual results. Use a duplicate recipe when testing a variation.</p>
        <form onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const input = Object.fromEntries(new FormData(form));
          if (act(() => recordTestBatch(data, input), "Test batch saved.")) form.reset();
        }}>
          <RecipeField recipes={data.recipes} />
          <label>Batch name<input name="label" placeholder="e.g. Less sweet frosting" required /></label>
          <div className="form-row">
            <label>Test date<input name="date" type="date" defaultValue={localDay()} required /></label>
            <NumberField label="Actual portions" name="yield" min="1" />
          </div>
          <div className="form-row">
            <NumberField label="Actual ingredient cost ($)" name="ingredientCost" step="0.01" />
            <NumberField label="Actual prep (minutes)" name="prepMinutes" step="any" />
          </div>
          <label>Tasting notes<textarea name="notes" rows={3} /></label>
          <button className="primary">Save test batch</button>
        </form>
      </section>
      <section className="panel planning-form">
        <h2>Compare results</h2>
        {!trials.length ? <p className="hint">Save two batches to compare results side by side.</p> : (
          <>
            <div className="form-row">
              {trialField("First batch", first, setLeft)}
              {trialField("Second batch", second, setRight)}
            </div>
            <RecipeField recipes={data.recipes} label="Main recipe to update" value={target} onChange={(event) => setTarget(event.target.value)} />
            <p className="hint">Using a test batch updates the main recipe’s formula, yield and prep time. The previous recipe is available in Recipe Lab.</p>
            <div className="form-row">
              {[first, second].map((trial, index) => trial && (
                <article key={index}>
                  <h3>{trial.label}</h3>
                  <p>{trial.yield} portions · {money(trial.ingredientCost)} ingredients · {trial.prepMinutes} min prep</p>
                  <p>{money(trial.ingredientCost / trial.yield)} ingredients per portion</p>
                  <p>{trial.notes || "No tasting notes."}</p>
                  <button className="secondary" disabled={!target} onClick={() => {
                    if (window.confirm("Use this test batch as the main recipe?")) {
                      act(() => promoteTestBatch(data, trial.id, target), "Main recipe updated.");
                    }
                  }}>
                    Use this batch
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function PickupWindows({ data, act, navigate, initialOrderId }) {
  const [editing, setEditing] = useState("");
  const [day, setDay] = useState(() =>
    data.orders.find((order) => order.id === initialOrderId)?.pickupDate || localDay(),
  );
  const [orderId, setOrderId] = useState(initialOrderId || "");
  const [copyStatus, setCopyStatus] = useState("");
  const slots = (data.pickupSlots || [])
    .filter((slot) => slot.date === day)
    .sort((a, b) => a.start.localeCompare(b.start));
  const orders = (data.orders || []).filter((order) => order.status === "open" && order.pickupDate === day);
  const order = orders.find((entry) => entry.id === orderId);
  const slot = slots.find((entry) => entry.id === editing);
  const confirmation = order ? pickupConfirmation(data, order) : "";

  return (
    <div className="planning-layout">
      <section className="panel planning-form">
        <h2>Pickup schedule</h2>
        <label>
          Pickup day
          <input type="date" value={day} onChange={(event) => {
            setDay(event.target.value);
            setEditing("");
            setOrderId("");
            setCopyStatus("");
          }} />
        </label>
        <form key={slot?.id || day} onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const input = Object.fromEntries(new FormData(form));
          if (act(() => savePickupSlot(data, { ...input, date: day }, editing), "Pickup window saved.")) {
            form.reset();
            setEditing("");
          }
        }}>
          <div className="form-row">
            <label>From<input name="start" type="time" defaultValue={slot?.start || "10:00"} required /></label>
            <label>To<input name="end" type="time" defaultValue={slot?.end || "11:00"} required /></label>
            <NumberField name="limit" label="Order limit" min="1" defaultValue={slot?.limit || 3} />
          </div>
          <button className="primary" disabled={!day}>{slot ? "Save changes" : "Add window"}</button>
          {slot && <button type="button" className="secondary" onClick={() => setEditing("")}>Cancel edit</button>}
        </form>
        {slots.map((entry) => (
          <div className="item-row" key={entry.id}>
            <p><strong>{entry.start}–{entry.end}</strong> · {pickupReservations(data, entry.id).length}/{entry.limit} booked</p>
            <button className="text-button" onClick={() => setEditing(entry.id)}>Edit</button>
            <button className="text-button" disabled={pickupReservations(data, entry.id).length > 0} onClick={() => {
              if (act(() => removePickupSlot(data, entry.id), "Pickup window removed.") && editing === entry.id) setEditing("");
            }}>Remove</button>
          </div>
        ))}
      </section>
      <section className="panel planning-form">
        <h2>Assign an order</h2>
        <p className="hint">Choose an open order on this pickup day. To change the day, reschedule it in Orders first.</p>
        <label>
          Order
          <select value={orderId} onChange={(event) => {
            setOrderId(event.target.value);
            setCopyStatus("");
          }}>
            <option value="">Choose an open order</option>
            {orders.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.customer || "Customer"} · {entry.recipeName} · {entry.orderNumber || entry.portions}</option>
            ))}
          </select>
        </label>
        {order && (
          <label>
            Pickup window
            <select value={order.pickupSlotId || ""} onChange={(event) => {
              setCopyStatus("");
              act(() => assignPickupSlot(data, order.id, event.target.value), "Pickup assignment saved.");
            }}>
              <option value="">No window assigned</option>
              {slots.map((entry) => (
                <option key={entry.id} value={entry.id} disabled={entry.id !== order.pickupSlotId && pickupReservations(data, entry.id).length >= entry.limit}>
                  {entry.start}–{entry.end}
                </option>
              ))}
            </select>
          </label>
        )}
        {confirmation && (
          <>
            <label>Customer confirmation<textarea rows={6} readOnly value={confirmation} /></label>
            <button className="secondary" onClick={async () => {
              try {
                await navigator.clipboard.writeText(confirmation);
                setCopyStatus("Copied.");
              } catch {
                setCopyStatus("Select and copy the message above.");
              }
            }}>Copy confirmation</button>
            <span role="status">{copyStatus}</span>
          </>
        )}
        {!orders.length && <button className="secondary" onClick={() => navigate("Orders")}>Open orders</button>}
      </section>
    </div>
  );
}

function PricePreview({ data, act, navigate }) {
  const [recipeId, setRecipeId] = useState("");
  const [price, setPrice] = useState("");
  let preview;
  let error = "";
  if (recipeId && price !== "") {
    try {
      preview = previewMenuPrice(data, recipeId, price);
    } catch (failure) {
      error = failure.message;
    }
  }

  return (
    <div className="planning-layout">
      <section className="panel planning-form">
        <h2>Try a new selling price</h2>
        <RecipeField recipes={data.recipes} value={recipeId} onChange={(event) => {
          setRecipeId(event.target.value);
          setPrice("");
        }} />
        <NumberField name="price" label="New price per selling unit ($)" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} />
        <p className="hint">Uses the recipe’s current costs and pricing assumptions. Saved quotes and accepted orders keep their existing prices.</p>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" disabled={!preview || preview.current.salePrice === preview.next.salePrice} onClick={() => {
          if (window.confirm("Apply this price to future sales of this recipe?")) {
            act(() => applyMenuPrice(data, recipeId, price), "Menu price saved.");
          }
        }}>Apply menu price</button>
      </section>
      <section className="panel quote-preview" aria-live="polite">
        <h2>Margin and quotes</h2>
        {preview ? (
          <>
            <p>Per {preview.current.label} ({preview.current.quantity} portion(s))</p>
            <table>
              <thead><tr><th scope="col">Metric</th><th scope="col">Current</th><th scope="col">Proposed</th></tr></thead>
              <tbody>
                <tr><th scope="row">Menu price</th><td>{money(preview.current.salePrice)}</td><td>{money(preview.next.salePrice)}</td></tr>
                <tr><th scope="row">Estimated profit</th><td>{money(preview.current.current.profit)}</td><td>{money(preview.proposed.current.profit)}</td></tr>
                <tr><th scope="row">Estimated margin</th><td>{preview.current.margin.toFixed(1)}%</td><td>{preview.proposed.margin.toFixed(1)}%</td></tr>
              </tbody>
            </table>
            <h3>Open quotes to review</h3>
            {preview.openQuotes.length ? (
              <>
                <ul>
                  {preview.openQuotes.map((quote) => (
                    <li key={quote.id}>{quote.quoteNumber || "Quote"} · {quote.customer || "Customer"} · {quote.snapshot.portions} portions · {money(quote.snapshot.total)} saved</li>
                  ))}
                </ul>
                <button className="secondary" onClick={() => navigate("Quotes")}>Review saved quotes</button>
              </>
            ) : <p>No open quotes for this recipe.</p>}
          </>
        ) : <p className="hint">Choose a recipe and enter a proposed price to compare.</p>}
      </section>
    </div>
  );
}
