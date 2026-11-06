import React, { useMemo, useState } from "react";
import { AlertTriangle, Download, ImagePlus, Printer } from "lucide-react";
import PrintAction from "./PrintAction.jsx";
import {
  backupSummary,
  exportCsv,
  importCsv,
  productionTimeline,
  recipeCostAlerts,
  salesTrend,
  saveOrderRequest,
  saveRecurringTask,
  saveSubstitution,
  tasksForDate,
  timeLabel,
} from "./ownerToolkit.js";
import { recipePricingPlan } from "./recipePricing.js";
import {
  downloadBlob,
  localDay,
  money,
  readReferenceImage,
} from "./uiFormatters.js";

const today = () => localDay();

export default function OwnerToolkitWorkspace({ data, save, page, navigate }) {
  if (page === "Order intake")
    return <OrderIntake data={data} save={save} navigate={navigate} />;
  if (page === "Production timeline") return <ProductionTimeline data={data} />;
  if (page === "Recurring prep")
    return <RecurringPrep data={data} save={save} />;
  if (page === "Substitutions")
    return <Substitutions data={data} save={save} />;
  if (page === "Label studio") return <LabelStudio data={data} save={save} />;
  if (page === "Kitchen binder") return <KitchenBinder data={data} />;
  if (page === "Cost alerts")
    return <CostAlerts data={data} navigate={navigate} />;
  if (page === "Sales trends") return <SalesTrends data={data} />;
  return <DataTools data={data} save={save} />;
}

function OrderIntake({ data, save, navigate }) {
  const [editing, setEditing] = useState("");
  const [photo, setPhoto] = useState("");
  const [photoError, setPhotoError] = useState("");
  const selected = (data.orderRequests || []).find(
    (entry) => entry.id === editing,
  );
  const capturePhoto = async (event) => {
    try {
      setPhoto(await readReferenceImage(event.target.files[0]));
      setPhotoError("");
    } catch (error) {
      setPhotoError(error.message);
    }
    event.target.value = "";
  };
  const dates = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(`${today()}T12:00:00`);
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString("en-CA");
  });
  const moveRequest = (id, pickupDate) =>
    save({
      ...data,
      orderRequests: data.orderRequests.map((entry) =>
        entry.id === id
          ? { ...entry, pickupDate, updatedAt: new Date().toISOString() }
          : entry,
      ),
    });
  return (
    <div className="planning-workspace">
      <section className="panel intake-week">
        <div className="panel-heading">
          <div>
            <h2>Next seven pickup days</h2>
            <p>Drag an inquiry onto a day to reschedule it.</p>
          </div>
        </div>
        <div>
          {dates.map((date) => (
            <article
              key={date}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) =>
                moveRequest(event.dataTransfer.getData("text/plain"), date)
              }
            >
              <b>
                {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </b>
              {(data.orderRequests || [])
                .filter((entry) => entry.pickupDate === date)
                .map((entry) => (
                  <span
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("text/plain", entry.id)
                    }
                    key={entry.id}
                  >
                    {entry.customer}
                    <small>{entry.pickupTime || "Time not set"}</small>
                  </span>
                ))}
            </article>
          ))}
        </div>
      </section>
      <div className="planning-layout">
        <section className="panel planning-form">
          <div className="panel-heading">
            <div>
              <h2>
                {editing ? "Edit inquiry" : "New customer order worksheet"}
              </h2>
              <p>Capture the request before creating a priced quote.</p>
            </div>
            <PrintAction className="secondary">
              <Printer size={15} />
              Print blank form
            </PrintAction>
          </div>
          <form
            key={editing || "new"}
            onSubmit={(event) => {
              event.preventDefault();
              const input = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              const next = saveOrderRequest(
                data,
                { ...input, photo: photo || selected?.photo || "" },
                editing,
              );
              if (save(next) !== false) {
                setEditing("");
                setPhoto("");
                event.currentTarget.reset();
              }
            }}
          >
            <div className="form-row">
              <label>
                Customer
                <input
                  name="customer"
                  defaultValue={selected?.customer || ""}
                  required
                />
              </label>
              <label>
                Occasion
                <input
                  name="occasion"
                  defaultValue={selected?.occasion || ""}
                  placeholder="Birthday, wedding, market"
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Pickup date
                <input
                  name="pickupDate"
                  type="date"
                  defaultValue={selected?.pickupDate || today()}
                  required
                />
              </label>
              <label>
                Pickup time
                <input
                  name="pickupTime"
                  type="time"
                  defaultValue={selected?.pickupTime || ""}
                />
              </label>
              <label>
                Servings
                <input
                  name="servings"
                  type="number"
                  min="0"
                  defaultValue={selected?.servings || ""}
                />
              </label>
            </div>
            <label>
              Flavors / menu ideas
              <textarea name="flavors" defaultValue={selected?.flavors || ""} />
            </label>
            <label>
              Design, colors, writing, and theme
              <textarea name="design" defaultValue={selected?.design || ""} />
            </label>
            <label>
              Allergies / dietary needs
              <textarea name="dietary" defaultValue={selected?.dietary || ""} />
            </label>
            <div className="form-row">
              <label>
                Budget
                <input
                  name="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={selected?.budget || ""}
                />
              </label>
              <label>
                Status
                <select
                  name="status"
                  defaultValue={selected?.status || "inquiry"}
                >
                  <option value="inquiry">Inquiry</option>
                  <option value="quoted">Quoted</option>
                  <option value="accepted">Accepted</option>
                  <option value="declined">Declined</option>
                </select>
              </label>
            </div>
            <label>
              Owner notes
              <textarea name="notes" defaultValue={selected?.notes || ""} />
            </label>
            <label className="photo-picker">
              <ImagePlus size={18} />
              Reference photo
              <input type="file" accept="image/*" onChange={capturePhoto} />
            </label>
            {photoError && (
              <p className="error" role="alert">
                {photoError}
              </p>
            )}
            {(photo || selected?.photo) && (
              <img
                className="order-reference-photo"
                src={photo || selected.photo}
                alt="Order reference"
              />
            )}
            <div className="planning-actions">
              <button className="primary">Save inquiry</button>
              {editing && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setEditing("");
                    setPhoto("");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>
        <section>
          <div className="section-top">
            <h2>
              Intake board{" "}
              <span className="pill">{(data.orderRequests || []).length}</span>
            </h2>
          </div>
          <div className="customer-list">
            {[...(data.orderRequests || [])]
              .sort((a, b) => a.pickupDate.localeCompare(b.pickupDate))
              .map((request) => (
                <article
                  className="panel customer-card"
                  draggable
                  onDragStart={(event) =>
                    event.dataTransfer.setData("text/plain", request.id)
                  }
                  key={request.id}
                >
                  <div className="recipe-card-title">
                    <div>
                      <h3>{request.customer}</h3>
                      <p>
                        {request.pickupDate} {request.pickupTime} ·{" "}
                        {request.occasion || "Custom order"}
                      </p>
                    </div>
                    <span className="sale-format-badge">{request.status}</span>
                  </div>
                  {request.photo && (
                    <img
                      className="order-reference-photo card-photo"
                      src={request.photo}
                      alt="Reference"
                    />
                  )}
                  <p>
                    {request.servings ? `${request.servings} servings · ` : ""}
                    {request.flavors}
                  </p>
                  {request.dietary && (
                    <p className="customer-alert">
                      <b>Dietary:</b> {request.dietary}
                    </p>
                  )}
                  <div className="planning-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setEditing(request.id);
                        setPhoto(request.photo || "");
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button"
                      onClick={() => navigate("Quotes")}
                    >
                      Create quote
                    </button>
                    <button
                      className="text-button"
                      onClick={() =>
                        save({
                          ...data,
                          orderRequests: data.orderRequests.filter(
                            (entry) => entry.id !== request.id,
                          ),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ProductionTimeline({ data }) {
  const [date, setDate] = useState(today()),
    [start, setStart] = useState("06:00");
  const rows = productionTimeline(data, date, start);
  return (
    <div className="operations-stack">
      <section className="panel planning-form">
        <div className="panel-heading">
          <div>
            <h2>Timed kitchen schedule</h2>
            <p>
              Turns recipe prep, bake, cooling, decorating, and packing times
              into a working day.
            </p>
          </div>
          <div className="form-row">
            <input
              aria-label="Date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <input
              aria-label="Start time"
              type="time"
              value={start}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>
        </div>
      </section>
      <section className="panel timeline-board">
        {rows.map((row) => (
          <article key={row.id}>
            <time>
              {timeLabel(row.start)}
              <small>{timeLabel(row.end)}</small>
            </time>
            <i />
            <div>
              <b>{row.recipeName}</b>
              <span>
                {row.phase} · {row.duration} minutes
              </span>
              {row.equipment && <small>{row.equipment}</small>}
            </div>
          </article>
        ))}
        {!rows.length && (
          <p className="empty">No pending production tasks for this date.</p>
        )}
      </section>
    </div>
  );
}

function RecurringPrep({ data, save }) {
  const [date, setDate] = useState(today());
  const due = tasksForDate(data, date);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="planning-layout">
      <section className="panel planning-form">
        <h2>New recurring task</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            save(
              saveRecurringTask(data, {
                ...Object.fromEntries(form),
                weekdays: form.getAll("weekdays"),
              }),
            );
            event.currentTarget.reset();
          }}
        >
          <label>
            Task
            <input name="title" required placeholder="Feed sourdough starter" />
          </label>
          <div className="weekday-picker">
            {weekdays.map((day, index) => (
              <label key={day}>
                <input type="checkbox" name="weekdays" value={index} />
                {day}
              </label>
            ))}
          </div>
          <div className="form-row">
            <label>
              Time
              <input name="time" type="time" defaultValue="06:00" />
            </label>
            <label>
              Area
              <input name="area" placeholder="Prep, cleaning, ordering" />
            </label>
          </div>
          <label>
            Instructions
            <textarea name="notes" />
          </label>
          <button className="primary">Save recurring task</button>
        </form>
      </section>
      <section>
        <div className="section-top">
          <h2>Tasks due</h2>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
        {due.map((task) => (
          <article className="panel purchase-order-card" key={task.id}>
            <div>
              <span className="eyebrow">
                {task.time} · {task.area || "GENERAL"}
              </span>
              <h3>{task.title}</h3>
              <p>{task.notes}</p>
            </div>
            <button
              className="text-button"
              onClick={() =>
                save({
                  ...data,
                  recurringTasks: data.recurringTasks.filter(
                    (entry) => entry.id !== task.id,
                  ),
                })
              }
            >
              Remove
            </button>
          </article>
        ))}
        {!due.length && (
          <p className="panel empty">
            No recurring tasks scheduled for this day.
          </p>
        )}
      </section>
    </div>
  );
}

function Substitutions({ data, save }) {
  const ingredients = data.items.filter((item) => item.type !== "packaging");
  return (
    <div className="planning-layout">
      <section className="panel planning-form">
        <h2>Approved substitution</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            save(
              saveSubstitution(
                data,
                Object.fromEntries(new FormData(event.currentTarget)),
              ),
            );
            event.currentTarget.reset();
          }}
        >
          <label>
            When this is unavailable
            <select name="itemId" required>
              <option value="">Choose ingredient</option>
              {ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Use this instead
            <select name="replacementId" required>
              <option value="">Choose replacement</option>
              {ingredients.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Replacement quantity for each 1 unit
            <input
              name="ratio"
              type="number"
              min="0.001"
              step="any"
              defaultValue="1"
            />
          </label>
          <label>
            Approval notes
            <textarea
              name="notes"
              placeholder="Taste, allergen, hydration, or method changes"
            />
          </label>
          <button className="primary">Save substitution</button>
        </form>
      </section>
      <section>
        <h2>Substitution guide</h2>
        {(data.substitutions || []).map((row) => (
          <article className="panel customer-card" key={row.id}>
            <h3>
              {data.items.find((item) => item.id === row.itemId)?.name} →{" "}
              {data.items.find((item) => item.id === row.replacementId)?.name}
            </h3>
            <p>Use {row.ratio} replacement units per original unit.</p>
            <small>{row.notes}</small>
            <button
              className="text-button"
              onClick={() =>
                save({
                  ...data,
                  substitutions: data.substitutions.filter(
                    (entry) => entry.id !== row.id,
                  ),
                })
              }
            >
              Remove
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function LabelStudio({ data, save }) {
  const template = {
    showBakery: true,
    showAllergens: true,
    showStorage: true,
    showBatch: true,
    message: "Thank you for supporting our bakery.",
    ...(data.settings?.labelTemplate || {}),
  };
  return (
    <div className="planning-layout">
      <section className="panel planning-form no-print">
        <h2>Label template</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            save({
              ...data,
              settings: {
                ...data.settings,
                labelTemplate: {
                  showBakery: form.has("showBakery"),
                  showAllergens: form.has("showAllergens"),
                  showStorage: form.has("showStorage"),
                  showBatch: form.has("showBatch"),
                  message: form.get("message"),
                },
              },
            });
          }}
        >
          <label className="check-row">
            <input
              name="showBakery"
              type="checkbox"
              defaultChecked={template.showBakery}
            />
            Bakery name
          </label>
          <label className="check-row">
            <input
              name="showAllergens"
              type="checkbox"
              defaultChecked={template.showAllergens}
            />
            Allergens
          </label>
          <label className="check-row">
            <input
              name="showStorage"
              type="checkbox"
              defaultChecked={template.showStorage}
            />
            Storage instructions
          </label>
          <label className="check-row">
            <input
              name="showBatch"
              type="checkbox"
              defaultChecked={template.showBatch}
            />
            Batch line
          </label>
          <label>
            Footer message
            <input name="message" defaultValue={template.message} />
          </label>
          <button className="primary">Save template</button>
        </form>
      </section>
      <section>
        <div className="panel-heading no-print">
          <h2>Label preview</h2>
          <PrintAction>Print labels</PrintAction>
        </div>
        <div className="label-studio-grid">
          {data.recipes.map((recipe) => (
            <article className="product-label" key={recipe.id}>
              {template.showBakery && (
                <span>{data.businessProfile?.name || "Bakery Ledger"}</span>
              )}
              <h3>{recipe.name}</h3>
              {template.showAllergens && (
                <p>
                  <small>ALLERGENS</small>
                  <b>{recipe.allergens || "Not specified"}</b>
                </p>
              )}
              {template.showStorage && (
                <p>
                  <small>STORAGE</small>
                  <b>{recipe.storageInstructions || "Not specified"}</b>
                </p>
              )}
              {template.showBatch && <p>Batch: __________ Made: __________</p>}
              <footer>{template.message}</footer>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function KitchenBinder({ data }) {
  const [date, setDate] = useState(today());
  const plans = data.productionPlans.filter((entry) => entry.date === date);
  const orders = data.orders.filter((entry) => entry.pickupDate === date);
  const tasks = tasksForDate(data, date);
  return (
    <div className="operations-stack">
      <div className="planning-toolbar no-print">
        <div>
          <h2>Daily kitchen binder</h2>
          <p>
            One printable packet for production, pickups, recurring prep, and
            owner notes.
          </p>
        </div>
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <PrintAction>
          <Printer size={16} />
          Preview & print binder
        </PrintAction>
      </div>
      <article className="panel kitchen-binder">
        <header>
          <span className="eyebrow">
            {data.businessProfile?.name || "BAKERY LEDGER"}
          </span>
          <h1>Kitchen day · {date}</h1>
        </header>
        <section>
          <h2>Production</h2>
          {plans.map((plan) => (
            <div className="binder-row" key={plan.id}>
              <span>
                ☐{" "}
                <b>
                  {plan.recipeName ||
                    data.recipes.find((recipe) => recipe.id === plan.recipeId)
                      ?.name}
                </b>
              </span>
              <span>
                {plan.batches} batch(es) · {plan.notes}
              </span>
            </div>
          ))}
        </section>
        <section>
          <h2>Pickups</h2>
          {orders.map((order) => (
            <div className="binder-row" key={order.id}>
              <span>
                ☐ <b>{order.customer}</b>
              </span>
              <span>
                {order.recipeName} · {order.portions} portions ·{" "}
                {money(order.total - (order.paid || 0))} due
              </span>
            </div>
          ))}
        </section>
        <section>
          <h2>Recurring prep & care</h2>
          {tasks.map((task) => (
            <div className="binder-row" key={task.id}>
              <span>
                ☐{" "}
                <b>
                  {task.time} {task.title}
                </b>
              </span>
              <span>{task.notes}</span>
            </div>
          ))}
        </section>
        <section className="binder-notes">
          <h2>Owner notes</h2>
        </section>
      </article>
    </div>
  );
}

function CostAlerts({ data, navigate }) {
  const alerts = recipeCostAlerts(data);
  return (
    <div className="operations-stack">
      <section className="panel planning-form">
        <h2>Recipe margin watch</h2>
        <p>
          Compares current ingredient, packaging, labor, utility, and overhead
          costs with each recipe’s saved pricing target.
        </p>
      </section>
      {alerts.map((alert) => (
        <article className="panel alert-card" key={alert.recipe.id}>
          <AlertTriangle />
          <div>
            <h3>{alert.recipe.name}</h3>
            {alert.error ? (
              <p>{alert.error}</p>
            ) : (
              <p>
                Current margin {alert.margin.toFixed(1)}% · target{" "}
                {alert.targetMargin}% · suggested {money(alert.suggestedSale)}{" "}
                per {alert.label}
              </p>
            )}
          </div>
          <button className="secondary" onClick={() => navigate("Recipe lab")}>
            Review pricing
          </button>
        </article>
      ))}
      {!alerts.length && (
        <p className="panel positive">
          Every recipe meets its saved minimum margin.
        </p>
      )}
    </div>
  );
}

function SalesTrends({ data }) {
  const rows = useMemo(() => salesTrend(data, 6), [data]);
  const max = Math.max(1, ...rows.map((row) => row.revenue));
  return (
    <div className="operations-stack">
      <section className="panel trend-chart">
        <h2>Six-month sales trend</h2>
        {rows.map((row) => (
          <div key={row.key}>
            <span>{row.label}</span>
            <i style={{ width: `${(row.revenue / max) * 100}%` }} />
            <b>{money(row.revenue)}</b>
            <small>
              {row.orders} sales · {money(row.profit)} gross profit
            </small>
          </div>
        ))}
      </section>
      <section className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>RECIPE</th>
              <th>PORTIONS SOLD</th>
              <th>REVENUE</th>
            </tr>
          </thead>
          <tbody>
            {data.recipes.map((recipe) => {
              const sales = data.sales.filter(
                (sale) => sale.recipeId === recipe.id,
              );
              return (
                <tr key={recipe.id}>
                  <td>{recipe.name}</td>
                  <td>
                    {sales.reduce(
                      (sum, sale) => sum + Number(sale.quantity || 0),
                      0,
                    )}
                  </td>
                  <td>
                    {money(
                      sales.reduce(
                        (sum, sale) =>
                          sum + Number(sale.net ?? sale.total ?? 0),
                        0,
                      ),
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function DataTools({ data, save }) {
  const [preview, setPreview] = useState(null),
    [importType, setImportType] = useState("ingredients"),
    [notice, setNotice] = useState(""),
    [photoRecipe, setPhotoRecipe] = useState(data.recipes[0]?.id || "");
  const types = ["ingredients", "recipes", "customers", "sales"];
  return (
    <div className="operations-grid">
      <section className="panel planning-form">
        <h2>CSV export</h2>
        <p>Keep portable spreadsheets of your catalog and records.</p>
        {types.map((type) => (
          <button
            className="secondary data-action"
            key={type}
            onClick={() =>
              downloadBlob(
                `bakery-ledger-${type}.csv`,
                exportCsv(data, type),
                "text/csv",
              )
            }
          >
            <Download size={15} />
            Export {type}
          </button>
        ))}
      </section>
      <section className="panel planning-form">
        <h2>CSV import</h2>
        <p>
          Matching IDs update records; new IDs add records. Export first to use
          the expected columns.
        </p>
        <label>
          Record type
          <select
            value={importType}
            onChange={(event) => setImportType(event.target.value)}
          >
            {types.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files[0];
              if (!file) return;
              try {
                const next = importCsv(data, importType, await file.text());
                if (
                  confirm(
                    `Import ${importType} from ${file.name}? A local backup will be created automatically.`,
                  )
                ) {
                  save(next);
                  setNotice(`${importType} imported.`);
                }
              } catch (error) {
                setNotice(error.message);
              }
              event.target.value = "";
            }}
          />
        </label>
        {notice && <p className="draft-status">{notice}</p>}
      </section>
      <section className="panel planning-form">
        <h2>Backup inspector</h2>
        <p>
          Preview a backup’s record counts before opening Backups & recovery to
          restore it.
        </p>
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (event) => {
            try {
              setPreview(backupSummary(await event.target.files[0].text()));
            } catch (error) {
              setNotice(error.message);
            }
          }}
        />
        {preview && (
          <div className="ops-metrics">
            {Object.entries(preview.counts).map(([key, value]) => (
              <span key={key}>
                {key}
                <b>{value}</b>
              </span>
            ))}
          </div>
        )}
      </section>
      <section className="panel planning-form">
        <h2>Recipe photo library</h2>
        <p>
          Add one local reference photo per recipe for decoration, plating, or
          packaging. Images are limited to 1.5 MB.
        </p>
        <label>
          Recipe
          <select
            value={photoRecipe}
            onChange={(event) => setPhotoRecipe(event.target.value)}
          >
            {data.recipes.map((recipe) => (
              <option value={recipe.id} key={recipe.id}>
                {recipe.name}
              </option>
            ))}
          </select>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={async (event) => {
            try {
              const image = await readReferenceImage(event.target.files[0]);
              if (image)
                save({
                  ...data,
                  recipePhotos: [
                    ...(data.recipePhotos || []).filter(
                      (entry) => entry.recipeId !== photoRecipe,
                    ),
                    {
                      id: crypto.randomUUID(),
                      recipeId: photoRecipe,
                      image,
                      updatedAt: new Date().toISOString(),
                    },
                  ],
                });
              setNotice("");
            } catch (error) {
              setNotice(error.message);
            }
            event.target.value = "";
          }}
        />
        {(data.recipePhotos || []).map((photo) => (
          <div className="recipe-photo-row" key={photo.id}>
            <img
              src={photo.image}
              alt={
                data.recipes.find((recipe) => recipe.id === photo.recipeId)
                  ?.name || "Recipe"
              }
            />
            <span>
              <b>
                {
                  data.recipes.find((recipe) => recipe.id === photo.recipeId)
                    ?.name
                }
              </b>
              <small>Stored on this device</small>
            </span>
            <button
              className="text-button"
              onClick={() =>
                save({
                  ...data,
                  recipePhotos: data.recipePhotos.filter(
                    (entry) => entry.id !== photo.id,
                  ),
                })
              }
            >
              Remove
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
