import { directSaleTotals, purchaseTax } from "./taxation.js";
import { receiveInventory, reconcileLots } from "./inventoryLots.js";
import {
  adjustFinishedStock,
  removeAccidentalProductLot,
  finishedProductAlerts,
} from "./productLots.js";
import React, { useDeferredValue, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { addPresets, availability, produce, fullCost } from "./operations.js";
import { recipeSaleDetails } from "./recipePricing.js";
import { localDay, money } from "./uiFormatters.js";
export function SaleFields({ data }) {
  const [lines, setLines] = useState(() => [
      {
        id: crypto.randomUUID(),
        recipeId: data.recipes[0]?.id || "",
        units: 1,
        discount: 0,
      },
    ]),
    [rate, setRate] = useState(data.salesTaxRate ?? 0),
    [customerId, setCustomerId] = useState(""),
    [customerName, setCustomerName] = useState(""),
    [orderType, setOrderType] = useState("Walk-in sale");
  const rows = lines.map((line) => {
    const recipe = data.recipes.find((entry) => entry.id === line.recipeId);
    const sale = recipeSaleDetails(recipe);
    const stock = data.products[recipe?.id]?.quantity || 0;
    const quantity = (Number(line.units) || 0) * sale.quantity;
    let totals;
    try {
      totals = directSaleTotals(
        recipe?.price || 0,
        quantity,
        line.discount,
        rate,
      );
    } catch {
      totals = { subtotal: 0, discount: 0, net: 0, tax: 0, total: 0 };
    }
    return { ...line, recipe, sale, stock, quantity, totals };
  });
  const totals = rows.reduce(
    (sum, row) => ({
      subtotal: sum.subtotal + row.totals.subtotal,
      discount: sum.discount + row.totals.discount,
      net: sum.net + row.totals.net,
      tax: sum.tax + row.totals.tax,
      total: sum.total + row.totals.total,
    }),
    { subtotal: 0, discount: 0, net: 0, tax: 0, total: 0 },
  );
  const patchLine = (id, patch) =>
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  return (
    <>
      <section className="sale-entry-section">
        <div className="sale-entry-heading">
          <span>1</span>
          <div>
            <h3>Items and price</h3>
            <p>Choose what left the bakery and confirm the total.</p>
          </div>
        </div>
        <div className="sale-cart-lines">
          {rows.map((row, index) => (
            <div className="sale-cart-line" key={row.id}>
              <div className="sale-cart-line-heading">
                <b>Dessert {index + 1}</b>
                {lines.length > 1 && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      setLines((current) =>
                        current.filter((line) => line.id !== row.id),
                      )
                    }
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <label>
                Dessert
                <select
                  value={row.recipeId}
                  onChange={(event) =>
                    patchLine(row.id, {
                      recipeId: event.target.value,
                      units: 1,
                      discount: 0,
                    })
                  }
                  required
                >
                  {data.recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.name} · {data.products[recipe.id]?.quantity || 0}{" "}
                      available
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  Quantity ({row.sale.label}
                  {row.units === 1 ? "" : "s"})
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, Math.floor(row.stock / row.sale.quantity))}
                    step="1"
                    value={row.units}
                    onChange={(event) =>
                      patchLine(row.id, { units: +event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Discount ($)
                  <input
                    type="number"
                    min="0"
                    max={row.sale.salePrice * row.units}
                    step="0.01"
                    value={row.discount}
                    onChange={(event) =>
                      patchLine(row.id, { discount: +event.target.value })
                    }
                  />
                </label>
              </div>
              <div className="sale-unit-summary">
                <span>
                  {row.quantity} portion{row.quantity === 1 ? "" : "s"}
                </span>
                <b>{money(row.totals.total)}</b>
                <small>
                  {row.stock} portions available · {money(row.sale.salePrice)}{" "}
                  per {row.sale.label}
                </small>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="secondary sale-add-line"
          onClick={() =>
            setLines((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                recipeId: data.recipes[0]?.id || "",
                units: 1,
                discount: 0,
              },
            ])
          }
        >
          <Plus size={16} /> Add another dessert
        </button>
        <input
          type="hidden"
          name="saleLines"
          value={JSON.stringify(
            rows.map((row) => ({
              recipeId: row.recipeId,
              quantity: row.quantity,
              discount: row.discount,
            })),
          )}
        />
        <label>
          Customer sales tax (%)
          <input
            name="taxRate"
            type="number"
            min="0"
            max="100"
            step="any"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </label>
        <p className="hint">
          Added after discounts. Recipe selling prices are before customer sales
          tax. Use 0% for a sale with no tax.
        </p>
        <div className="tax-breakdown sale-cart-total">
          <dl>
            <dt>
              {rows.length} dessert type{rows.length === 1 ? "" : "s"}
            </dt>
            <dd>{money(totals.subtotal)}</dd>
            <dt>Discount</dt>
            <dd>−{money(totals.discount)}</dd>
            <dt>Sales tax ({rate}%)</dt>
            <dd>{money(totals.tax)}</dd>
            <dt>Customer total</dt>
            <dd>{money(totals.total)}</dd>
          </dl>
        </div>
      </section>
      <section className="sale-entry-section sale-entry-details">
        <div className="sale-entry-heading">
          <span>2</span>
          <div>
            <h3>Order details</h3>
            <p>Label the sale and add the customer when useful.</p>
          </div>
        </div>
        {!!data.customers?.length && (
          <label>
            Customer book
            <select
              name="customerId"
              value={customerId}
              onChange={(event) => {
                const customer = data.customers.find(
                  (item) => item.id === event.target.value,
                );
                setCustomerId(customer?.id || "");
                if (customer) setCustomerName(customer.name);
              }}
            >
              <option value="">New or walk-in customer</option>
              {data.customers.map((customer) => (
                <option value={customer.id} key={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Customer name
          <input
            name="customer"
            value={customerName}
            onChange={(event) => {
              setCustomerName(event.target.value);
              const selected = data.customers?.find(
                (item) => item.id === customerId,
              );
              if (selected?.name !== event.target.value) setCustomerId("");
            }}
            placeholder="Optional for walk-in sales"
          />
        </label>
        <div className="form-row">
          <label>
            Order type
            <select
              name="orderType"
              value={orderType}
              onChange={(event) => setOrderType(event.target.value)}
            >
              <option>Walk-in sale</option>
              <option>Custom order</option>
              <option>Pre-order pickup</option>
              <option>Delivery</option>
              <option>Wholesale</option>
              <option>Market / pop-up</option>
              <option>Catering</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Date
            <input name="date" type="date" defaultValue={localDay()} required />
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
          Use Customer orders for deposits, invoices, and scheduled production.
          This form records a completed finished-stock sale.
        </p>
      </section>
    </>
  );
}
export default function Operations({ data, save, open, tab }) {
  const [error, setError] = useState(""),
    [q, setQ] = useState(""),
    [activeStockId, setActiveStockId] = useState(""),
    [activeProductAction, setActiveProductAction] = useState(""),
    [showInventoryGuide, setShowInventoryGuide] = useState(
      () =>
        localStorage.getItem("bakery-ledger-inventory-guide-dismissed") !==
        "true",
    );
  const deferredQuery = useDeferredValue(q).toLocaleLowerCase();
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
          {showInventoryGuide && (
            <div className="operations-banner">
              <div>
                <h2>Ingredient & packaging inventory</h2>
                <p>
                  Stock uses each item's purchase unit. Receive purchases or
                  count stock below. Presets need your actual purchase prices.
                </p>
              </div>
              <div className="operations-banner-actions">
                <button
                  className="secondary"
                  onClick={() => act(() => addPresets(data))}
                >
                  Add common ingredients
                </button>
                <button
                  className="icon-button banner-close"
                  type="button"
                  aria-label="Dismiss inventory setup guidance"
                  title="Dismiss this guidance"
                  onClick={() => {
                    localStorage.setItem(
                      "bakery-ledger-inventory-guide-dismissed",
                      "true",
                    );
                    setShowInventoryGuide(false);
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
          <div className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>ON HAND</th>
                  <th>STOCK ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {data.items
                  .filter((i) =>
                    i.name.toLocaleLowerCase().includes(deferredQuery),
                  )
                  .slice(0, 100)
                  .map((i) => (
                    <tr key={i.id}>
                      <td>
                        <b>{i.name}</b>
                        <small>
                          {i.needsPrice
                            ? "Purchase price required"
                            : `${money(purchaseTax(i).total)} / ${i.amount} ${i.unit} (final cost)`}
                        </small>
                        <small className="conversion-summary">
                          {conversionSummary(i)}
                        </small>
                      </td>
                      <td>
                        <b>
                          {Number((i.stock || 0).toFixed(3))} {i.unit}
                        </b>
                        <small>{!i.stock ? "Out of stock" : ""}</small>
                      </td>
                      <td>
                        <div className="stock-row-actions">
                          <button
                            className="secondary"
                            onClick={() =>
                              setActiveStockId((current) =>
                                current === i.id ? "" : i.id,
                              )
                            }
                          >
                            {activeStockId === i.id ? "Close" : "Update stock"}
                          </button>
                          <button
                            className="text-button"
                            onClick={() => open("item", i)}
                          >
                            Edit item
                          </button>
                        </div>
                        {activeStockId === i.id && (
                          <StockForm
                            item={i}
                            onDone={() => setActiveStockId("")}
                            apply={(form, kind) =>
                              act(() =>
                                kind === "receive"
                                  ? receiveInventory(data, i.id, form)
                                  : {
                                      ...data,
                                      inventoryLots: reconcileLots(
                                        data.inventoryLots || [],
                                        i.id,
                                        +form.quantity,
                                      ),
                                      items: data.items.map((x) =>
                                        x.id === i.id
                                          ? { ...x, stock: +form.quantity }
                                          : x,
                                      ),
                                      movements: [
                                        ...data.movements,
                                        {
                                          id: crypto.randomUUID(),
                                          date: new Date().toISOString(),
                                          name: i.name,
                                          kind: "Count",
                                          quantity: +form.quantity,
                                          unit: i.unit,
                                        },
                                      ],
                                    },
                              )
                            }
                          />
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <details className="panel stock-activity">
            <summary>Recent stock activity</summary>
            {data.movements
              .slice(-15)
              .reverse()
              .map((m) => (
                <div className="legend" key={m.id}>
                  <span>
                    {m.kind} · {m.name}
                    {m.reason ? ` · ${m.reason}` : ""}
                  </span>
                  <b>
                    {m.delta > 0 ? "+" : ""}
                    {m.delta ?? m.quantity} {m.unit || "portions"} ·{" "}
                    {m.effectiveDate || m.date.slice(0, 10)}
                  </b>
                </div>
              ))}
            {!data.movements.length && (
              <p className="accounting-note">No stock movements yet.</p>
            )}
          </details>
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
            .filter((r) => r.name.toLocaleLowerCase().includes(deferredQuery))
            .slice(0, 60)
            .map((r) => {
              const a = availability(r, data.items),
                stock = data.products[r.id] || { quantity: 0, value: 0 },
                productLots = (data.productLots || [])
                  .filter((lot) => lot.recipeId === r.id && lot.remaining > 0)
                  .sort((x, y) =>
                    (x.bestBefore || "9999").localeCompare(
                      y.bestBefore || "9999",
                    ),
                  ),
                expiryAlerts = finishedProductAlerts(data, localDay()).filter(
                  (lot) => lot.recipeId === r.id,
                );
              let cost;
              try {
                cost = fullCost(r, data.items, data.settings);
              } catch {}
              return (
                <section className="panel recipe-card" key={r.id}>
                  <span className="pill">{r.category}</span>
                  <h3>{r.name}</h3>
                  <dl>
                    {tab === "Product stock" ? (
                      <>
                        <dt>Available</dt>
                        <dd>{stock.quantity} portions</dd>
                        <dt>Stock value</dt>
                        <dd>{money(stock.value)}</dd>
                        <dt>Average captured cost</dt>
                        <dd>
                          {stock.quantity
                            ? money(stock.value / stock.quantity)
                            : "—"}
                        </dd>
                        <dt>Next best-before</dt>
                        <dd>{productLots[0]?.bestBefore || "Not tracked"}</dd>
                      </>
                    ) : (
                      <>
                        <dt>Batches you can make</dt>
                        <dd>{a.batches}</dd>
                        <dt>Potential portions</dt>
                        <dd>{a.portions}</dd>
                        <dt>Full batch cost</dt>
                        <dd>
                          {cost === undefined
                            ? "Needs conversion"
                            : money(cost)}
                        </dd>
                        <dt>Full cost per portion</dt>
                        <dd>
                          {cost === undefined ? "—" : money(cost / r.yield)}
                        </dd>
                      </>
                    )}
                  </dl>
                  {tab === "Product stock" && productLots.length > 0 && (
                    <details className="finished-lot-list">
                      <summary>{productLots.length} finished lot(s)</summary>
                      {productLots.slice(0, 4).map((lot) => (
                        <div
                          className={
                            lot.bestBefore && lot.bestBefore < localDay()
                              ? "negative"
                              : ""
                          }
                          key={lot.id}
                        >
                          <span>
                            {lot.remaining} portions · made {lot.producedAt}
                          </span>
                          <b>
                            {lot.bestBefore
                              ? `Best before ${lot.bestBefore}`
                              : "No shelf life set"}
                          </b>
                          <button
                            className="text-button lot-discard"
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  `Remove this accidentally added lot and reverse all ${lot.remaining} portions? This corrects finished stock without recording waste.`,
                                )
                              )
                                act(() =>
                                  removeAccidentalProductLot(data, lot.id, {
                                    reason: "Accidentally added finished lot",
                                  }),
                                );
                            }}
                          >
                            Remove lot
                          </button>
                        </div>
                      ))}
                      {expiryAlerts.some((lot) => lot.expired) && (
                        <p className="negative">
                          Expired finished stock needs review.
                        </p>
                      )}
                      {r.storageInstructions && <p>{r.storageInstructions}</p>}
                    </details>
                  )}
                  {tab === "Can make" && a.error && (
                    <div className="error">{a.error}</div>
                  )}
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
                  {tab === "Can make" ? (
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
                  ) : (
                    <FinishedStockControls
                      recipe={r}
                      stock={stock}
                      availability={a}
                      active={activeProductAction}
                      setActive={setActiveProductAction}
                      recordProduction={(batches) =>
                        act(() => produce(data, r.id, batches))
                      }
                      adjust={(input) =>
                        act(() =>
                          adjustFinishedStock(data, r.id, {
                            ...input,
                            unitCost: cost === undefined ? 0 : cost / r.yield,
                          }),
                        )
                      }
                    />
                  )}
                  <button
                    className="text-button"
                    onClick={() => open("recipe", r)}
                  >
                    Edit recipe
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
function conversionSummary(item) {
  const values = [
    item.gramsPerCan && `${item.gramsPerCan} g/can`,
    item.gramsPerCup && `${item.gramsPerCup} g/cup`,
    item.gramsPerTbsp && `${item.gramsPerTbsp} g/tbsp`,
    item.gramsPerTsp && `${item.gramsPerTsp} g/tsp`,
    item.gramsPerStick && `${item.gramsPerStick} g/stick`,
    item.gramsPerEach && `${item.gramsPerEach} g/each`,
    item.density && `${item.density} g/ml`,
  ].filter(Boolean);
  return values.length ? values.join(" · ") : "No custom conversion";
}

function StockForm({ item, apply, onDone }) {
  const [n, setN] = useState(""),
    [kind, setKind] = useState("receive"),
    [details, setDetails] = useState(false);
  return (
    <form
      className="stock-form"
      onSubmit={(e) => {
        e.preventDefault();
        const fields = Object.fromEntries(new FormData(e.currentTarget));
        const saved = apply(
          kind === "receive"
            ? {
                packages: +n,
                packagePrice: fields.packagePrice,
                expiryDate: fields.expiryDate,
                supplier: fields.supplier,
                receivedAt: fields.receivedAt,
              }
            : { quantity: +n },
          kind,
        );
        if (saved !== false) {
          setN("");
          onDone?.();
        }
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
      {kind === "receive" && (
        <>
          <button
            className="text-button"
            type="button"
            onClick={() => setDetails(!details)}
          >
            {details ? "Hide lot details" : "Lot details"}
          </button>
          {details && (
            <div className="stock-lot-fields">
              <label>
                Received
                <input
                  name="receivedAt"
                  type="date"
                  defaultValue={localDay()}
                  required
                />
              </label>
              <label>
                Expiry
                <input name="expiryDate" type="date" />
              </label>
              <label>
                Package price
                <input
                  name="packagePrice"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={item.price}
                  required
                />
              </label>
              <label>
                Supplier
                <input name="supplier" defaultValue={item.supplier || ""} />
              </label>
            </div>
          )}
        </>
      )}
    </form>
  );
}

function FinishedStockControls({
  recipe,
  stock,
  availability,
  active,
  setActive,
  recordProduction,
  adjust,
}) {
  const [direction, setDirection] = useState(
    stock.quantity > 0 ? "remove" : "add",
  );
  const productionKey = `${recipe.id}:produce`;
  const adjustmentKey = `${recipe.id}:adjust`;
  const close = () => setActive("");
  return (
    <div className="finished-stock-controls">
      <div className="finished-stock-actions">
        <button
          className="primary"
          onClick={() =>
            setActive(active === productionKey ? "" : productionKey)
          }
        >
          + Record made
        </button>
        <button
          className="secondary"
          onClick={() =>
            setActive(active === adjustmentKey ? "" : adjustmentKey)
          }
        >
          Adjust count
        </button>
      </div>
      {active === productionKey && (
        <form
          className="stock-action-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const batches = Number(
              new FormData(event.currentTarget).get("batches"),
            );
            if (recordProduction(batches) !== false) close();
          }}
        >
          <div>
            <b>Record completed production</b>
            <small>
              Adds finished portions and deducts the recipe ingredients and
              packaging.
            </small>
            {availability.error && (
              <small className="negative">{availability.error}</small>
            )}
          </div>
          <label>
            Batches
            <input
              name="batches"
              type="number"
              min="1"
              max={availability.batches || 1}
              step="1"
              defaultValue="1"
              required
            />
          </label>
          <div className="planning-actions">
            <button className="primary" disabled={!availability.batches}>
              Add made stock
            </button>
            <button type="button" className="text-button" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {active === adjustmentKey && (
        <form
          className="stock-action-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const input = Object.fromEntries(new FormData(event.currentTarget));
            if (adjust(input) !== false) close();
          }}
        >
          <div>
            <b>Correct the finished count</b>
            <small>
              Use for damage, samples, returns, opening counts, or count
              corrections.
            </small>
          </div>
          <div className="form-row">
            <label>
              Action
              <select
                name="direction"
                value={direction}
                onChange={(event) => setDirection(event.target.value)}
              >
                <option value="remove">Remove portions</option>
                <option value="add">Add portions</option>
              </select>
            </label>
            <label>
              Portions
              <input
                name="quantity"
                type="number"
                min="1"
                max={direction === "remove" ? stock.quantity || 1 : undefined}
                step="1"
                required
              />
            </label>
            <label>
              Date
              <input
                name="date"
                type="date"
                defaultValue={localDay()}
                required
              />
            </label>
          </div>
          <label>
            Reason
            <select name="reason" required>
              {direction === "remove" ? (
                <>
                  <option>Damaged</option>
                  <option>Sampled</option>
                  <option>Expired</option>
                  <option>Donated</option>
                  <option>Count correction</option>
                </>
              ) : (
                <>
                  <option>Opening count</option>
                  <option>Returned to stock</option>
                  <option>Count correction</option>
                </>
              )}
            </select>
          </label>
          <label>
            Note (optional)
            <input name="note" placeholder="What happened?" />
          </label>
          <div className="planning-actions">
            <button className="primary">
              {direction === "remove" ? "Remove stock" : "Add stock"}
            </button>
            <button type="button" className="text-button" onClick={close}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
