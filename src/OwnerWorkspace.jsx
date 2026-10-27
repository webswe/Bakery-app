import React, { useState } from "react";
import {
  calendarEntries,
  orderPaid,
  ownerForecast,
  recordPayment,
  taxReport,
  wasteAnalysis,
} from "./ownerOps.js";
import { lotAlerts } from "./inventoryLots.js";
import { localDate } from "./planning.js";
import { createLock, verifyPin } from "./security.js";

const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n || 0);
const qty = (n) => Number((n || 0).toFixed(3));
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
const download = (name, rows) => {
  const url = URL.createObjectURL(
    new Blob(
      [rows.map((row) => row.map(csvCell).join(",")).join("\\r\\n")],
      { type: "text/csv" },
    ),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};

export default function OwnerWorkspace({
  data,
  save,
  page,
  lockConfig,
  setLockConfig,
  lockNow,
}) {
  const [error, setError] = useState("");
  const act = (fn) => {
    try {
      if (save(fn()) === false) return false;
      setError("");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };
  return (
    <div className="planning-workspace owner-workspace">
      {error && <p className="error">{error}</p>}
      {page === "Calendar" ? (
        <Calendar data={data} />
      ) : page === "Prep sheets" ? (
        <PrepSheets data={data} />
      ) : page === "Inventory lots" ? (
        <InventoryLots data={data} />
      ) : page === "Supplier prices" ? (
        <SupplierPrices data={data} />
      ) : page === "Payments" ? (
        <Payments data={data} act={act} />
      ) : page === "Tax report" ? (
        <TaxReport data={data} />
      ) : page === "Waste analysis" ? (
        <WasteReport data={data} />
      ) : page === "Owner forecast" ? (
        <Forecast data={data} />
      ) : (
        <Security
          config={lockConfig}
          setConfig={setLockConfig}
          lockNow={lockNow}
        />
      )}
    </div>
  );
}

function Calendar({ data }) {
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const entries = calendarEntries(data, month);
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  const start = new Date(year, monthNumber - 1, 1).getDay();
  return (
    <>
      <div className="planning-toolbar">
        <div>
          <h2>Production & pickup calendar</h2>
          <p>One schedule for kitchen work and customer commitments.</p>
        </div>
        <label>
          Month
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
      </div>
      <section className="calendar-grid panel">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <b className="calendar-weekday" key={day}>
            {day}
          </b>
        ))}
        {Array.from({ length: start }, (_, i) => (
          <span className="calendar-empty" key={"empty-" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const rows = entries.filter((entry) => entry.date === date);
          return (
            <div className="calendar-day" key={date}>
              <strong>{i + 1}</strong>
              {rows.map((row) => (
                <span className={"calendar-event " + row.type.toLowerCase()} key={row.id}>
                  <b>{row.type}</b>
                  {row.title}
                  <small>{row.detail}</small>
                </span>
              ))}
            </div>
          );
        })}
      </section>
      {!entries.length && (
        <p className="panel empty">No pickups or production tasks this month.</p>
      )}
    </>
  );
}

function PrepSheets({ data }) {
  const [date, setDate] = useState(localDate());
  const plans = data.productionPlans.filter((plan) => plan.date === date);
  return (
    <>
      <div className="planning-toolbar no-print">
        <div>
          <h2>Batch prep sheets & labels</h2>
          <p>Uses the recipe snapshot captured when the task was planned.</p>
        </div>
        <label>
          Production date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <button className="secondary no-print" onClick={() => window.print()}>
        Print prep sheets & labels
      </button>
      <div className="prep-sheet-grid">
        {plans.map((plan) => {
          const snapshot = plan.recipeSnapshot;
          const recipe =
            snapshot?.recipe ||
            data.recipes.find((item) => item.id === plan.recipeId);
          const items = snapshot?.items?.filter(Boolean) || data.items;
          const order = data.orders.find((item) => item.id === plan.orderId);
          return (
            <article className="panel prep-sheet" key={plan.id}>
              <header>
                <span className="pill">{plan.status}</span>
                <h2>{recipe?.name || plan.recipeName}</h2>
                <p>
                  {plan.batches} batch(es) ·{" "}
                  {(recipe?.yield || 0) * plan.batches} portions · {date}
                </p>
              </header>
              {order && (
                <div className="prep-customer">
                  <b>{order.customer || "Customer order"}</b>
                  <span>Pickup {order.pickupDate}</span>
                  <span>{order.notes}</span>
                </div>
              )}
              <h3>Scaled ingredients & packaging</h3>
              {recipe?.lines.map((line, index) => (
                <div className="legend" key={index}>
                  <span>
                    {items.find((item) => item.id === line.itemId)?.name ||
                      "Missing item"}
                  </span>
                  <b>
                    {qty(line.amount * plan.batches)} {line.unit}
                  </b>
                </div>
              ))}
              <p>
                <b>Allergens:</b> {recipe?.allergens || "Not specified"}
              </p>
              <p>
                <b>Kitchen notes:</b> {plan.notes || "—"}
              </p>
              <div className="prep-checks">
                {["Bake", "Chill", "Decorate", "Pack"].map((step) => (
                  <span key={step}>☐ {step}</span>
                ))}
              </div>
              <div className="batch-label">
                <b>{recipe?.name}</b>
                <span>{order?.customer || "Bakery stock"}</span>
                <span>{order ? "Pickup " + order.pickupDate : date}</span>
                <span>Allergens: {recipe?.allergens || "Not specified"}</span>
              </div>
            </article>
          );
        })}
      </div>
      {!plans.length && <p className="panel empty">No production tasks for this date.</p>}
    </>
  );
}

function InventoryLots({ data }) {
  const [showEmpty, setShowEmpty] = useState(false);
  const rows = (data.inventoryLots || [])
    .filter((lot) => showEmpty || lot.remaining > 0)
    .sort(
      (a, b) =>
        (a.expiryDate || "9999").localeCompare(b.expiryDate || "9999") ||
        b.receivedAt.localeCompare(a.receivedAt),
    );
  const alerts = lotAlerts(data, localDate());
  return (
    <>
      <div className="planning-toolbar">
        <div>
          <h2>Delivery lots</h2>
          <p>
            New receipts are consumed earliest-expiry first. Older aggregate stock
            remains available as legacy stock.
          </p>
        </div>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={showEmpty}
            onChange={(e) => setShowEmpty(e.target.checked)}
          />
          Show depleted lots
        </label>
      </div>
      <div className="stats planning-stats">
        <div className="stat">
          <div>Active lots</div>
          <strong>{rows.filter((lot) => lot.remaining > 0).length}</strong>
        </div>
        <div className="stat">
          <div>Expired lots</div>
          <strong>{alerts.filter((lot) => lot.expired).length}</strong>
        </div>
        <div className="stat">
          <div>Upcoming expiry</div>
          <strong>{alerts.filter((lot) => !lot.expired).length}</strong>
        </div>
      </div>
      <section className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>ITEM</th>
              <th>RECEIVED</th>
              <th>EXPIRY</th>
              <th>REMAINING</th>
              <th>SUPPLIER</th>
              <th>PRICE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lot) => {
              const item = data.items.find((i) => i.id === lot.itemId);
              return (
                <tr key={lot.id}>
                  <td><b>{item?.name || "Removed item"}</b></td>
                  <td>{lot.receivedAt}</td>
                  <td className={lot.expiryDate && lot.expiryDate <= localDate() ? "negative" : ""}>
                    {lot.expiryDate || "Not set"}
                  </td>
                  <td>{qty(lot.remaining)} {lot.unit}</td>
                  <td>{lot.supplier || "—"}</td>
                  <td>{money(lot.packagePrice)} / package</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function SupplierPrices({ data }) {
  const rows = [...(data.purchaseHistory || [])].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  return (
    <>
      <div className="planning-toolbar">
        <div>
          <h2>Supplier price history</h2>
          <p>Every lot receipt captures the supplier and package price paid.</p>
        </div>
        <button
          className="secondary"
          onClick={() =>
            download("supplier-prices.csv", [
              ["Date", "Supplier", "Item", "Package price", "Final cost", "Packages"],
              ...rows.map((row) => [
                row.date,
                row.supplier,
                row.itemName,
                row.packagePrice,
                row.finalPackageCost,
                row.packages,
              ]),
            ])
          }
        >
          Export CSV
        </button>
      </div>
      <section className="panel table-scroll">
        <table>
          <thead><tr><th>DATE</th><th>SUPPLIER</th><th>ITEM</th><th>ENTERED</th><th>FINAL COST</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td><td>{row.supplier || "—"}</td>
                <td>{row.itemName}</td><td>{money(row.packagePrice)}</td>
                <td>{money(row.finalPackageCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {!rows.length && <p className="panel empty">Receive a lot to start price history.</p>}
    </>
  );
}

function Payments({ data, act }) {
  const openOrders = data.orders.filter((order) => order.status !== "cancelled");
  const [orderId, setOrderId] = useState(openOrders[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState("payment");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState(localDate());
  const order = data.orders.find((item) => item.id === orderId);
  const entries = [...(data.payments || [])]
    .filter((payment) => !orderId || payment.orderId === orderId)
    .reverse();
  return (
    <>
      <div className="planning-layout">
        <section className="panel planning-form no-print">
          <h2>Record payment or refund</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (
                act(() =>
                  recordPayment(data, orderId, {
                    amount,
                    kind,
                    method,
                    date,
                  }),
                )
              )
                setAmount("");
            }}
          >
            <label>
              Order
              <select value={orderId} onChange={(e) => setOrderId(e.target.value)} required>
                <option value="">Choose an order</option>
                {openOrders.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.customer || item.recipeName} · balance {money(item.total - orderPaid(data, item))}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>Entry type<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="payment">Payment</option><option value="refund">Refund</option></select></label>
              <label>Amount<input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label>
            </div>
            <div className="form-row">
              <label>Method<select value={method} onChange={(e) => setMethod(e.target.value)}><option>Cash</option><option>Card</option><option>Bank transfer</option><option>Other</option></select></label>
              <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
            </div>
            <button className="primary">Record {kind}</button>
          </form>
        </section>
        <section className="panel receipt">
          <span className="eyebrow">PAYMENT RECEIPT</span>
          <h2>{order?.customer || "Choose an order"}</h2>
          {order && (
            <dl>
              <dt>Order</dt><dd>{order.recipeName}</dd>
              <dt>Total</dt><dd>{money(order.total)}</dd>
              <dt>Paid</dt><dd>{money(orderPaid(data, order))}</dd>
              <dt>Balance</dt><dd>{money(order.total - orderPaid(data, order))}</dd>
            </dl>
          )}
          <button className="secondary no-print" onClick={() => window.print()}>Print receipt</button>
        </section>
      </div>
      <section className="panel table-scroll">
        <table>
          <thead><tr><th>DATE</th><th>CUSTOMER</th><th>TYPE</th><th>METHOD</th><th>AMOUNT</th></tr></thead>
          <tbody>
            {entries.map((entry) => {
              const linked = data.orders.find((item) => item.id === entry.orderId);
              return <tr key={entry.id}><td>{entry.date}</td><td>{linked?.customer || linked?.recipeName}</td><td>{entry.kind}</td><td>{entry.method}</td><td className={entry.kind === "refund" ? "negative" : "positive"}>{entry.kind === "refund" ? "−" : ""}{money(entry.amount)}</td></tr>;
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function TaxReport({ data }) {
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const report = taxReport(data, month);
  const metrics = [
    ["Sales before tax", report.netSales],
    ["Customer tax collected", report.customerTax],
    ["Gross receipts", report.grossReceipts],
    ["Purchase tax paid", report.purchaseTax],
  ];
  return (
    <>
      <ReportHeader title="Tax summary" month={month} setMonth={setMonth} onExport={() => download(`tax-report-${month}.csv`, [["Metric", "Amount"], ...metrics, ["Taxable sales", report.taxableSales], ["Zero-tax sales", report.zeroTaxSales], ["Legacy sales count", report.legacySales]])} />
      <MetricCards rows={metrics} />
      <section className="panel planning-form"><h2>Tax basis</h2><p>Taxable sales: <b>{money(report.taxableSales)}</b></p><p>Zero-tax sales: <b>{money(report.zeroTaxSales)}</b></p><p>Historical sales without a saved tax breakdown: <b>{report.legacySales}</b></p><p className="hint">This report summarizes recorded transactions. It does not calculate remittances, credits, filing rules, or legal tax obligations.</p></section>
    </>
  );
}

function WasteReport({ data }) {
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const report = wasteAnalysis(data, month);
  return (
    <>
      <ReportHeader title="Waste analysis" month={month} setMonth={setMonth} onExport={() => download(`waste-${month}.csv`, [["Date", "Item", "Reason", "Quantity", "Unit", "Cost"], ...report.rows.map((row) => [row.date, row.name, row.reason, row.amount, row.unit, row.cost])])} />
      <MetricCards rows={[["Total waste cost", report.total], ["Waste entries", report.rows.length]]} />
      <div className="planning-layout"><Breakdown title="By reason" rows={report.byReason} /><Breakdown title="By item" rows={report.byItem} /></div>
    </>
  );
}

function Forecast({ data }) {
  const [start, setStart] = useState(localDate());
  const report = ownerForecast(data, start);
  return (
    <>
      <div className="planning-toolbar"><div><h2>Seven-day owner forecast</h2><p>Expected orders, cash still due, production cost, and minimum-stock purchasing.</p></div><label>Week starts<input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label></div>
      <MetricCards rows={[["Expected order revenue", report.expectedRevenue], ["Already received", report.received], ["Still due", report.outstanding], ["Planned production cost", report.plannedCost], ["Minimum-stock purchases", report.purchaseCash], ["Projected margin", report.projectedMargin]]} />
      <section className="panel planning-form"><h2>{report.start} through {report.end}</h2>{report.orders.map((order) => <div className="legend" key={order.id}><span>{order.customer || order.recipeName}<small>{order.pickupDate}</small></span><b>{money(order.total)}</b></div>)}{!report.orders.length && <p>No open orders in this period.</p>}<p className="hint">Projected margin excludes unplanned purchases, refunds, taxes due, and operating expenses. It is a working forecast, not an accounting statement.</p></section>
    </>
  );
}

function Security({ config, setConfig, lockNow }) {
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [minutes, setMinutes] = useState(config?.minutes || 5);
  const [message, setMessage] = useState("");
  const save = async (event) => {
    event.preventDefault();
    if (config && !(await verifyPin(currentPin, config)))
      return setMessage("Current PIN is incorrect.");
    try {
      const next = await createLock(pin, minutes);
      setConfig(next);
      setPin("");
      setCurrentPin("");
      setMessage("PIN lock saved.");
    } catch (e) {
      setMessage(e.message);
    }
  };
  const remove = async () => {
    if (!(await verifyPin(currentPin, config)))
      return setMessage("Current PIN is incorrect.");
    setConfig(null);
    setMessage("PIN lock removed.");
  };
  return (
    <section className="panel planning-form security-panel">
      <h2>Optional local PIN lock</h2>
      <p>Protects this device when the bakery computer is unattended. The salted PIN hash stays in local browser storage and is not included in workspace exports.</p>
      <form onSubmit={save}>
        {config && <label>Current PIN<input type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} required /></label>}
        <label>{config ? "New PIN" : "PIN"}<input type="password" inputMode="numeric" pattern="[0-9]{4,8}" value={pin} onChange={(e) => setPin(e.target.value)} required /></label>
        <label>Lock after inactivity (minutes)<input type="number" min="1" max="240" value={minutes} onChange={(e) => setMinutes(e.target.value)} required /></label>
        <button className="primary">{config ? "Change PIN lock" : "Enable PIN lock"}</button>
      </form>
      {message && <p role="status">{message}</p>}
      {config && <div className="planning-actions"><button className="secondary" onClick={lockNow}>Lock now</button><button className="text-button" onClick={remove}>Remove PIN lock</button></div>}
    </section>
  );
}

function ReportHeader({ title, month, setMonth, onExport }) {
  return <div className="planning-toolbar"><div><h2>{title}</h2><p>Based on locally recorded bakery transactions.</p></div><div className="planning-actions"><label>Month<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label><button className="secondary" onClick={onExport}>Export CSV</button></div></div>;
}
function MetricCards({ rows }) {
  return <div className="stats planning-stats">{rows.map(([label, value]) => <div className="stat" key={label}><div>{label}</div><strong>{typeof value === "number" && !Number.isInteger(value) ? money(value) : typeof value === "number" && /cost|revenue|received|due|margin|receipts|sales|tax|purchases/i.test(label) ? money(value) : value}</strong></div>)}</div>;
}
function Breakdown({ title, rows }) {
  return <section className="panel planning-form"><h2>{title}</h2>{rows.map((row) => <div className="legend" key={row.label}><span>{row.label}<small>{row.count} entr{row.count === 1 ? "y" : "ies"}</small></span><b>{money(row.cost)}</b></div>)}{!rows.length && <p>No waste recorded.</p>}</section>;
}
