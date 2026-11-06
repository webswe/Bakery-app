import React, { useEffect, useMemo, useState } from "react";
import {
  archiveCompletedRecords,
  capacityForecast,
  commonAllergens,
  menuProfitability,
  restoreArchive,
  restoreRecipeRevision,
  saveCloseout,
  saveEquipment,
} from "./bakeryOperations.js";
import {
  recipeCostDetails,
  recipePricingPlan,
  recipeSaleDetails,
} from "./recipePricing.js";
import { localDay, money } from "./uiFormatters.js";

const today = () => localDay();
const qty = (value) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
    Number(value) || 0,
  );

export default function BakeryOperationsWorkspace({
  data,
  save,
  page,
  open,
  navigate,
}) {
  if (page === "Recipe lab")
    return <RecipeLab data={data} save={save} open={open} />;
  if (page === "Allergen matrix") return <AllergenMatrix data={data} />;
  if (page === "Capacity planner")
    return <CapacityPlanner data={data} save={save} navigate={navigate} />;
  if (page === "Kitchen timers")
    return <KitchenTimers data={data} save={save} />;
  if (page === "Daily closeout")
    return <DailyCloseout data={data} save={save} navigate={navigate} />;
  if (page === "Equipment care")
    return <EquipmentCare data={data} save={save} />;
  if (page === "Menu profitability") return <Profitability data={data} />;
  if (page === "Archive") return <Archive data={data} save={save} />;
  return <PurchaseOrders data={data} save={save} navigate={navigate} />;
}

function RecipeLab({ data, save, open }) {
  const [selected, setSelected] = useState(data.recipes[0]?.id || "");
  const recipe = data.recipes.find((entry) => entry.id === selected);
  const referencePhoto = (data.recipePhotos || []).find(
    (entry) => entry.recipeId === selected,
  );
  const versions = (data.recipeVersions || [])
    .filter((entry) => entry.recipeId === selected)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const details = recipe
    ? recipeCostDetails(recipe, data.items, data.settings)
    : null;
  const pricing = recipe
    ? recipePricingPlan(recipe, data.items, data.settings, recipe.pricingPlan)
    : null;
  const updateTiers = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const tier = {
      id: crypto.randomUUID(),
      name: form.get("name").trim(),
      quantity: Number(form.get("quantity")),
      price: Number(form.get("price")),
    };
    if (!tier.name || !(tier.quantity > 0) || !(tier.price >= 0)) return;
    save({
      ...data,
      recipes: data.recipes.map((entry) =>
        entry.id === recipe.id
          ? { ...entry, priceTiers: [...(entry.priceTiers || []), tier] }
          : entry,
      ),
    });
    event.currentTarget.reset();
  };
  return (
    <div className="operations-stack">
      <section className="panel planning-form">
        <div className="panel-heading">
          <div>
            <h2>Recipe development lab</h2>
            <p>
              Compare pricing, keep customer tiers, and return to earlier
              versions.
            </p>
          </div>
          <select
            aria-label="Recipe"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {data.recipes.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        {recipe && (
          <>
            {referencePhoto && (
              <img
                className="recipe-lab-photo"
                src={referencePhoto.image}
                alt={`${recipe.name} reference`}
              />
            )}
            <div className="ops-metrics">
              <span>
                Batch cost<b>{money(details.total)}</b>
              </span>
              <span>
                Cost / portion<b>{money(details.perPortion)}</b>
              </span>
              <span>
                Current margin<b>{qty(details.margin)}%</b>
              </span>
              <span>
                Yield<b>{recipe.yield}</b>
              </span>
            </div>
            <button
              className="secondary"
              onClick={() => open("recipe", recipe)}
            >
              Edit recipe
            </button>
          </>
        )}
      </section>
      {recipe && (
        <section className="panel pricing-plan-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PRICING PLAN</span>
              <h2>Protect the margin before publishing a price</h2>
              <p>
                Includes ingredients, packaging, labor, electricity and batch
                overhead.
              </p>
            </div>
            <span
              className={
                pricing.belowMinimum
                  ? "margin-health danger"
                  : pricing.margin < pricing.targetMargin
                    ? "margin-health warning"
                    : "margin-health"
              }
            >
              {qty(pricing.margin)}% current margin
            </span>
          </div>
          <form
            className="compact-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              save({
                ...data,
                recipes: data.recipes.map((entry) =>
                  entry.id === recipe.id
                    ? {
                        ...entry,
                        pricingPlan: {
                          targetMargin: Number(form.targetMargin),
                          minimumMargin: Number(form.minimumMargin),
                          roundTo: Number(form.roundTo),
                        },
                      }
                    : entry,
                ),
              });
            }}
          >
            <label>
              Target margin (%)
              <input
                name="targetMargin"
                type="number"
                min="0"
                max="95"
                step="1"
                defaultValue={pricing.targetMargin}
              />
            </label>
            <label>
              Minimum margin alert (%)
              <input
                name="minimumMargin"
                type="number"
                min="0"
                max="95"
                step="1"
                defaultValue={pricing.minimumMargin}
              />
            </label>
            <label>
              Round prices to
              <input
                name="roundTo"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={pricing.roundTo}
              />
            </label>
            <button className="secondary">Save pricing plan</button>
          </form>
          <div className="pricing-recommendation">
            <div>
              <span>Current price</span>
              <b>
                {money(pricing.salePrice)} / {pricing.label}
              </b>
              <small>{money(pricing.unitPrice)} per portion</small>
            </div>
            <div>
              <span>Suggested price</span>
              <b>
                {money(pricing.suggestedSale)} / {pricing.label}
              </b>
              <small>
                {money(pricing.suggestedPortion)} per portion at{" "}
                {pricing.targetMargin}% target
              </small>
            </div>
            <div>
              <span>Price adjustment</span>
              <b
                className={pricing.priceGap > 0 ? "negative" : "positive-text"}
              >
                {pricing.priceGap > 0 ? "+" : ""}
                {money(pricing.priceGap)}
              </b>
              <small>
                {pricing.priceGap > 0
                  ? "Increase to reach target"
                  : "Current price meets target"}
              </small>
            </div>
          </div>
          <button
            className="primary"
            disabled={pricing.priceGap <= 0}
            onClick={() =>
              save({
                ...data,
                recipes: data.recipes.map((entry) =>
                  entry.id === recipe.id
                    ? {
                        ...entry,
                        salePrice: pricing.suggestedSale,
                        price: pricing.suggestedPortion,
                      }
                    : entry,
                ),
              })
            }
          >
            Apply suggested price
          </button>
        </section>
      )}
      {recipe && (
        <div className="operations-grid">
          <section className="panel planning-form">
            <h2>Pricing scenarios & tiers</h2>
            <p>
              Save retail, wholesale, event, or promotional pricing without
              changing the main card price.
            </p>
            <form className="compact-form" onSubmit={updateTiers}>
              <input name="name" placeholder="Wholesale box" required />
              <input
                name="quantity"
                type="number"
                min="1"
                placeholder="Portions"
                required
              />
              <input
                name="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Total price"
                required
              />
              <button className="primary">Add tier</button>
            </form>
            {(recipe.priceTiers || []).map((tier) => (
              <div className="legend" key={tier.id}>
                <span>
                  <b>{tier.name}</b>
                  <small>
                    {tier.quantity} portions ·{" "}
                    {money(tier.price / tier.quantity)} each
                  </small>
                </span>
                <span>
                  <b>{money(tier.price)}</b>
                  <button
                    className="text-button"
                    onClick={() =>
                      save({
                        ...data,
                        recipes: data.recipes.map((entry) =>
                          entry.id === recipe.id
                            ? {
                                ...entry,
                                priceTiers: entry.priceTiers.filter(
                                  (item) => item.id !== tier.id,
                                ),
                              }
                            : entry,
                        ),
                      })
                    }
                  >
                    Remove
                  </button>
                </span>
              </div>
            ))}
          </section>
          <section className="panel planning-form">
            <h2>Version history</h2>
            <p>
              Bakery Ledger saves the previous card each time you edit this
              recipe.
            </p>
            {versions.length ? (
              versions.map((version) => (
                <div className="legend" key={version.id}>
                  <span>
                    <b>{new Date(version.savedAt).toLocaleString()}</b>
                    <small>
                      Yield {version.recipe.yield} ·{" "}
                      {money(recipeSaleDetails(version.recipe).salePrice)} /{" "}
                      {recipeSaleDetails(version.recipe).label}
                    </small>
                  </span>
                  <button
                    className="secondary"
                    onClick={() => {
                      if (
                        confirm(
                          "Restore this recipe version? The current version will stay in history.",
                        )
                      )
                        save(restoreRecipeRevision(data, version.id));
                    }}
                  >
                    Restore
                  </button>
                </div>
              ))
            ) : (
              <p className="empty-note">History begins after the next edit.</p>
            )}
          </section>
        </div>
      )}
      <section className="panel planning-form">
        <h2>Reusable components & packaging presets</h2>
        <p>
          Reusable buttercreams, fillings, crusts, and packaging kits are
          available inside the recipe editor. Create one by opening a recipe and
          using its current lines as a starting point.
        </p>
        <div className="ops-metrics">
          <span>
            Sub-recipes<b>{(data.recipeComponents || []).length}</b>
          </span>
          <span>
            Packaging presets<b>{(data.packagingPresets || []).length}</b>
          </span>
        </div>
      </section>
    </div>
  );
}

function AllergenMatrix({ data }) {
  const allergenSet = (recipe) =>
    new Set(
      String(recipe.allergens || "")
        .split(/[,;]/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    );
  return (
    <section className="panel table-scroll">
      <table>
        <thead>
          <tr>
            <th>RECIPE</th>
            {commonAllergens.map((name) => (
              <th key={name}>{name.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.recipes.map((recipe) => {
            const set = allergenSet(recipe);
            return (
              <tr key={recipe.id}>
                <td>
                  <b>{recipe.name}</b>
                  <small>{recipe.allergens || "No allergens recorded"}</small>
                </td>
                {commonAllergens.map((name) => (
                  <td key={name}>
                    <span
                      className={
                        set.has(name.toLowerCase()) ||
                        (name === "Tree nuts" &&
                          [...set].some((item) => item.includes("nut")))
                          ? "allergen yes"
                          : "allergen"
                      }
                    >
                      {set.has(name.toLowerCase()) ||
                      (name === "Tree nuts" &&
                        [...set].some((item) => item.includes("nut")))
                        ? "YES"
                        : "—"}
                    </span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function CapacityPlanner({ data, save, navigate }) {
  const [start, setStart] = useState(today());
  const rows = capacityForecast(data, start);
  const capacity = {
    prep: 480,
    oven: 360,
    decorating: 300,
    packing: 240,
    ...(data.settings?.capacity || {}),
  };
  return (
    <div className="operations-stack">
      <section className="panel planning-form">
        <div className="panel-heading">
          <div>
            <h2>Daily capacity</h2>
            <p>Available minutes per day for each kitchen station.</p>
          </div>
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        <form
          className="compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = Object.fromEntries(new FormData(event.currentTarget));
            save({
              ...data,
              settings: {
                ...data.settings,
                capacity: Object.fromEntries(
                  Object.entries(form).map(([key, value]) => [
                    key,
                    Number(value),
                  ]),
                ),
              },
            });
          }}
        >
          {Object.entries(capacity).map(([key, value]) => (
            <label key={key}>
              {key}
              <input name={key} type="number" min="1" defaultValue={value} />
            </label>
          ))}
          <button className="primary">Save capacity</button>
        </form>
      </section>
      <section className="panel capacity-board">
        {rows.map((row) => (
          <article
            key={row.date}
            className={row.peak > 100 ? "over-capacity" : ""}
          >
            <div>
              <b>
                {new Date(`${row.date}T12:00:00`).toLocaleDateString(
                  undefined,
                  { weekday: "short", month: "short", day: "numeric" },
                )}
              </b>
              <small>{row.plans.length} production task(s)</small>
            </div>
            {Object.entries(row.load).map(([key, value]) => (
              <span key={key}>
                <i
                  style={{
                    width: `${Math.min(100, (value / row.capacity[key]) * 100)}%`,
                  }}
                />
                <small>
                  {key} {qty(value)} / {row.capacity[key]} min
                </small>
              </span>
            ))}
            <b>{qty(row.peak)}% peak</b>
          </article>
        ))}
      </section>
      <button className="secondary" onClick={() => navigate("Daily planner")}>
        Adjust production plan
      </button>
    </div>
  );
}

function KitchenTimers({ data, save }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const timers = data.kitchenTimers || [];
  const remaining = (timer) =>
    Math.max(
      0,
      timer.duration * 60 -
        Math.floor((Date.now() - new Date(timer.startedAt).getTime()) / 1000),
    );
  return (
    <div className="operations-stack">
      <section className="panel planning-form">
        <h2>Start a kitchen timer</h2>
        <form
          className="compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const timer = {
              id: crypto.randomUUID(),
              name: form.get("name").trim(),
              duration: Number(form.get("duration")),
              startedAt: new Date().toISOString(),
            };
            if (timer.name && timer.duration > 0)
              save({ ...data, kitchenTimers: [...timers, timer] });
            event.currentTarget.reset();
          }}
        >
          <input name="name" placeholder="Tres leches cooling" required />
          <input
            name="duration"
            type="number"
            min="1"
            placeholder="Minutes"
            required
          />
          <button className="primary">Start timer</button>
        </form>
      </section>
      <div className="timer-grid">
        {timers.map((timer) => {
          const seconds = remaining(timer);
          return (
            <article
              className={`panel timer-card ${seconds === 0 ? "timer-done" : ""}`}
              key={timer.id}
            >
              <span className="eyebrow">{seconds ? "RUNNING" : "READY"}</span>
              <h2>{timer.name}</h2>
              <b>
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </b>
              <button
                className="secondary"
                onClick={() =>
                  save({
                    ...data,
                    kitchenTimers: timers.filter(
                      (entry) => entry.id !== timer.id,
                    ),
                  })
                }
              >
                {seconds ? "Cancel" : "Dismiss"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DailyCloseout({ data, save, navigate }) {
  const [date, setDate] = useState(today());
  const saved =
    (data.closeouts || []).find((entry) => entry.date === date) || {};
  const checks = [
    "Payments reviewed",
    "Pickups completed",
    "Waste recorded",
    "Stock counted",
    "Tomorrow planned",
    "Backup reviewed",
  ];
  return (
    <section className="panel planning-form closeout-card">
      <div className="panel-heading">
        <div>
          <h2>Owner closeout</h2>
          <p>Finish the business and kitchen checks before leaving.</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </div>
      <form
        key={date + saved.savedAt}
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          save(
            saveCloseout(data, {
              date,
              checks: checks.filter((item) => form.get(item) === "on"),
              cashNote: form.get("cashNote"),
              tomorrowNote: form.get("tomorrowNote"),
            }),
          );
        }}
      >
        {checks.map((item) => (
          <label className="check-row" key={item}>
            <input
              type="checkbox"
              name={item}
              defaultChecked={saved.checks?.includes(item)}
            />
            <span>{item}</span>
          </label>
        ))}
        <label>
          Cash / payment note
          <textarea name="cashNote" defaultValue={saved.cashNote || ""} />
        </label>
        <label>
          First priority tomorrow
          <textarea
            name="tomorrowNote"
            defaultValue={saved.tomorrowNote || ""}
          />
        </label>
        <div className="planning-actions">
          <button className="primary">Save closeout</button>
          <button
            type="button"
            className="secondary"
            onClick={() => navigate("Daily snapshot")}
          >
            Review daily numbers
          </button>
        </div>
      </form>
    </section>
  );
}

function EquipmentCare({ data, save }) {
  return (
    <div className="operations-stack">
      <section className="panel planning-form">
        <h2>Add equipment</h2>
        <form
          className="compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = Object.fromEntries(new FormData(event.currentTarget));
            save(saveEquipment(data, form));
            event.currentTarget.reset();
          }}
        >
          <input name="name" placeholder="20 qt mixer" required />
          <input name="nextService" type="date" />
          <input name="notes" placeholder="Service interval or model" />
          <button className="primary">Add equipment</button>
        </form>
      </section>
      <div className="operations-grid">
        {(data.equipment || []).map((item) => (
          <article className="panel equipment-card" key={item.id}>
            <span className="eyebrow">NEXT SERVICE</span>
            <h2>{item.name}</h2>
            <p>{item.nextService || "No date set"}</p>
            <small>{item.notes}</small>
            <button
              className="secondary"
              onClick={() =>
                save({
                  ...data,
                  equipment: data.equipment.map((entry) =>
                    entry.id === item.id
                      ? { ...entry, lastService: today(), nextService: "" }
                      : entry,
                  ),
                  maintenanceLogs: [
                    ...(data.maintenanceLogs || []),
                    {
                      id: crypto.randomUUID(),
                      equipmentId: item.id,
                      equipmentName: item.name,
                      date: today(),
                    },
                  ],
                })
              }
            >
              Mark serviced today
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function Profitability({ data }) {
  const rows = useMemo(() => menuProfitability(data), [data]);
  return (
    <section className="panel table-scroll">
      <table>
        <thead>
          <tr>
            <th>MENU ITEM</th>
            <th>SOLD</th>
            <th>REVENUE</th>
            <th>EST. COST</th>
            <th>PROFIT</th>
            <th>MARGIN</th>
            <th>PROFIT / LABOR HR</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.recipe.id}>
              <td>
                <b>{row.recipe.name}</b>
                <small>{row.recipe.category}</small>
              </td>
              <td>{qty(row.sold)}</td>
              <td>{money(row.revenue)}</td>
              <td>{money(row.cost)}</td>
              <td className={row.profit < 0 ? "negative" : "positive-text"}>
                {money(row.profit)}
              </td>
              <td>{qty(row.margin)}%</td>
              <td>{money(row.profitPerLaborHour)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function PurchaseOrders({ data, save, navigate }) {
  return (
    <div className="operations-stack">
      <section className="panel planning-form">
        <h2>Supplier purchase orders</h2>
        <p>
          Shopping-list orders stay here as an owner record. Move drafts through
          ordered, received, and closed.
        </p>
        <button className="primary" onClick={() => navigate("Shopping list")}>
          Build from shopping list
        </button>
      </section>
      {[...(data.purchaseOrders || [])].reverse().map((order) => (
        <section className="panel purchase-order-card" key={order.id}>
          <div>
            <span className="eyebrow">{order.status || "DRAFT"}</span>
            <h2>Plan through {order.throughDate}</h2>
            <p>
              {order.rows.length} line(s) · {money(order.estimatedTotal)}
            </p>
          </div>
          <select
            value={order.status || "draft"}
            onChange={(event) =>
              save({
                ...data,
                purchaseOrders: data.purchaseOrders.map((entry) =>
                  entry.id === order.id
                    ? {
                        ...entry,
                        status: event.target.value,
                        updatedAt: new Date().toISOString(),
                      }
                    : entry,
                ),
              })
            }
          >
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
            <option value="closed">Closed</option>
          </select>
        </section>
      ))}
    </div>
  );
}

function Archive({ data, save }) {
  const defaultBefore = `${new Date().getFullYear() - 1}-01-01`;
  return (
    <div className="operations-stack">
      <section className="panel planning-form">
        <h2>Archive completed work</h2>
        <p>
          Move old completed orders and production tasks out of daily screens.
          The archive remains restorable and is included in backups.
        </p>
        <form
          className="compact-form"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              save(
                archiveCompletedRecords(
                  data,
                  new FormData(event.currentTarget).get("beforeDate"),
                ),
              );
            } catch (error) {
              alert(error.message);
            }
          }}
        >
          <label>
            Archive completed records before
            <input name="beforeDate" type="date" defaultValue={defaultBefore} />
          </label>
          <button className="primary">Create archive</button>
        </form>
      </section>
      {(data.archives || []).map((archive) => (
        <section className="panel purchase-order-card" key={archive.id}>
          <div>
            <h2>Before {archive.beforeDate}</h2>
            <p>
              {archive.orders.length} orders · {archive.productionPlans.length}{" "}
              production tasks
            </p>
            <small>
              Created {new Date(archive.createdAt).toLocaleString()}
            </small>
          </div>
          <button
            className="secondary"
            onClick={() => save(restoreArchive(data, archive.id))}
          >
            Restore
          </button>
        </section>
      ))}
    </div>
  );
}
