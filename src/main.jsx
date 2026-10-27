import { purchaseTax, purchaseMode, taxRate, saleRevenue } from "./taxation.js";
import Operations, { SaleFields } from "./InventoryWorkspace.jsx";
import { addPresets, sell, fullCost } from "./operations.js";
import Dashboard from "./Dashboard.jsx";
import { migrateData } from "./analytics.js";
import BakeryTools from "./BakeryTools.jsx";
import { persistWorkspace } from "./backupStorage.js";
import { stockAlerts } from "./business.js";
import PlanningWorkspace from "./PlanningWorkspace.jsx";
import OwnerWorkspace from "./OwnerWorkspace.jsx";
import TutorialWorkspace, { GuidedTutorial } from "./TutorialWorkspace.jsx";
import { verifyPin } from "./security.js";
import {
  sections,
  pages,
  sectionFor,
  readRoute,
  routeHash,
} from "./workspaceNavigation.js";
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  BookOpen,
  Package,
  ShoppingBasket,
  Plus,
  ArrowUpRight,
  Download,
  Upload,
  Trash2,
  ChefHat,
  TrendingUp,
  Settings,
  Search,
  X,
} from "lucide-react";
import { units, lineCost, recipeCost, convertItem } from "./costing.js";
import "./style.css";
const uid = () => crypto.randomUUID();
const lockKey = "bakery-ledger-lock-v1";
const tutorialKey = "bakery-ledger-tutorial-v1";
const readLock = () => {
  try {
    return JSON.parse(localStorage.getItem(lockKey)) || null;
  } catch {
    return null;
  }
};
const money = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
const today = () => new Date().toLocaleDateString("en-CA");
const initial = {
  tax: 7,
  taxRates: { food: 0, other: 7 },
  items: [
    {
      id: "milk",
      name: "Condensed milk",
      amount: 397,
      unit: "g",
      price: 1.79,
      taxIncluded: false,
      tax: 7,
      density: 1.3,
      gramsPerCan: 397,
      type: "ingredient",
    },
    {
      id: "flour",
      name: "All-purpose flour",
      amount: 2,
      unit: "kg",
      price: 5,
      taxIncluded: true,
      tax: 0,
      gramsPerCup: 120,
      type: "ingredient",
    },
    {
      id: "butter",
      name: "Unsalted butter",
      amount: 454,
      unit: "g",
      price: 4.5,
      taxIncluded: true,
      tax: 0,
      type: "ingredient",
    },
    {
      id: "box",
      name: "Kraft dessert box",
      amount: 25,
      unit: "each",
      price: 12,
      taxIncluded: true,
      tax: 0,
      type: "packaging",
    },
    {
      id: "fork",
      name: "Wooden fork",
      amount: 100,
      unit: "each",
      price: 5,
      taxIncluded: true,
      tax: 0,
      type: "packaging",
    },
  ],
  recipes: [
    {
      id: "cookies",
      name: "Butter cookie box",
      category: "Cookies",
      yield: 6,
      price: 12,
      lines: [
        { itemId: "milk", amount: 100, unit: "g" },
        { itemId: "flour", amount: 300, unit: "g" },
        { itemId: "butter", amount: 200, unit: "g" },
        { itemId: "box", amount: 6, unit: "each" },
      ],
    },
  ],
  sales: [],
  expenses: [],
};
function App() {
  const [data, setData] = useState(() => {
    try {
      return migrateData(
        JSON.parse(localStorage.getItem("bakery-ledger-v1")) ||
          addPresets(initial),
      );
    } catch {
      return migrateData(addPresets(initial));
    }
  });
  const [lockConfig, setLockState] = useState(readLock);
  const [locked, setLocked] = useState(() => !!readLock());
  const [showTutorial, setShowTutorial] = useState(
    () => !localStorage.getItem(tutorialKey),
  );
  const [page, setPage] = useState(() => readRoute(window.location.hash).page),
    [routeContext, setRouteContext] = useState(
      () => readRoute(window.location.hash).context,
    ),
    [modal, setModal] = useState(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [month, setMonth] = useState(today().slice(0, 7));
  const section = sectionFor(page),
    info = pages[page];
  function navigate(nextPage, context = {}) {
    setModal(null);
    setPage(nextPage);
    setRouteContext(context);
    setQuery("");
    setError("");
    window.location.hash = routeHash(nextPage, context);
  }
  useEffect(() => {
    const handle = () => {
      const route = readRoute(window.location.hash);
      setModal(null);
      setPage(route.page);
      setRouteContext(route.context);
      setQuery("");
      setError("");
    };
    window.addEventListener("hashchange", handle);
    return () => window.removeEventListener("hashchange", handle);
  }, []);
  useEffect(() => {
    document.getElementById("workspace-title")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [page]);
  useEffect(() => {
    if (!lockConfig || locked) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => setLocked(true),
        Math.max(1, Number(lockConfig.minutes) || 5) * 60_000,
      );
    };
    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((name) => window.addEventListener(name, reset));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, reset));
    };
  }, [lockConfig, locked]);
  function setLockConfig(next) {
    if (next) localStorage.setItem(lockKey, JSON.stringify(next));
    else localStorage.removeItem(lockKey);
    setLockState(next);
    setLocked(false);
  }
  function closeTutorial() {
    localStorage.setItem(tutorialKey, "complete");
    setShowTutorial(false);
  }
  function save(next, restoring = false) {
    try {
      persistWorkspace(localStorage, next, today(), restoring);
      setData(next);
      setError("");
      return true;
    } catch {
      setError("Could not save. Export a backup and check available storage.");
      return false;
    }
  }
  function open(type, value) {
    setError("");
    setModal({ type, value });
  }
  function cost(r) {
    try {
      return fullCost(r, data.items, data.settings);
    } catch {
      return null;
    }
  }
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    document.querySelector(".modal button")?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);
  const sales = data.sales.filter((s) => s.date.startsWith(month)),
    expenses = data.expenses.filter((s) => s.date.startsWith(month)),
    revenue = sales.reduce((s, x) => s + saleRevenue(x), 0),
    cogs = sales.reduce((s, x) => s + x.cost, 0),
    overhead = expenses.reduce((s, x) => s + x.amount, 0),
    profit = revenue - cogs - overhead;
  function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const persist = (next) => {
      if (!save(next))
        throw Error(
          "Could not save. Check available storage and export a backup.",
        );
    };
    try {
      if (modal.type === "tax") {
        persist({
          ...data,
          taxRates: { food: taxRate(f.food), other: taxRate(f.other) },
          salesTaxRate: taxRate(f.salesTaxRate),
        });
      }
      if (modal.type === "item") {
        const item = {
          ...modal.value,
          needsPrice: false,
          id: modal.value?.id || uid(),
          name: f.name,
          amount: +f.amount,
          unit: f.unit,
          price: +f.price,
          taxMode: f.taxMode,
          taxIncluded: f.taxMode !== "added",
          tax: +f.tax || 0,
          taxCategory: f.taxCategory,
          gramsPerCup: +f.gramsPerCup || null,
          gramsPerEach: +f.gramsPerEach || null,
          gramsPerCan: +f.gramsPerCan || null,
          supplier: f.supplier.trim(),
          minStock: +f.minStock || 0,
          expiryDate: f.expiryDate,
          density: +f.density || null,
          type: f.type,
        };
        if (modal.value?.stock && modal.value.unit !== item.unit)
          item.stock = convertItem(
            modal.value.stock,
            modal.value.unit,
            item.unit,
            { ...modal.value, ...item },
          );
        const inventoryLots =
          modal.value && modal.value.unit !== item.unit
            ? (data.inventoryLots || []).map((lot) =>
                lot.itemId === item.id
                  ? {
                      ...lot,
                      quantity: convertItem(
                        lot.quantity,
                        modal.value.unit,
                        item.unit,
                        { ...modal.value, ...item },
                      ),
                      remaining: convertItem(
                        lot.remaining,
                        modal.value.unit,
                        item.unit,
                        { ...modal.value, ...item },
                      ),
                      unit: item.unit,
                    }
                  : lot,
              )
            : data.inventoryLots;
        if (!(item.amount > 0) || item.price < 0 || item.tax < 0)
          throw Error("Enter valid quantities and prices.");
        purchaseTax(item);
        persist({
          ...data,
          items: [...data.items.filter((i) => i.id !== item.id), item],
          inventoryLots,
        });
      }
      if (modal.type === "recipe") {
        const lines = [...e.target.querySelectorAll("[data-line]")].map(
          (row) => ({
            itemId: row.querySelector('[name="itemId"]').value,
            amount: +row.querySelector('[name="quantity"]').value,
            unit: row.querySelector('[name="lineUnit"]').value,
          }),
        );
        if (!lines.length)
          throw Error("Add at least one ingredient or packaging item.");
        lines.forEach((l) => lineCost(l, data.items));
        const r = {
          id: modal.value?.id || uid(),
          name: f.name,
          category: f.category,
          yield: +f.yield,
          price: +f.price,
          allergens: f.allergens.trim(),
          lines,
          laborMinutes: +f.laborMinutes || 0,
          electricityKwh: +f.electricityKwh || 0,
          overheadPerBatch: +f.overheadPerBatch || 0,
        };
        persist({
          ...data,
          recipes: [...data.recipes.filter((x) => x.id !== r.id), r],
        });
      }
      if (modal.type === "sale") {
        persist(sell(data, f));
      }
      if (modal.type === "expense")
        persist({
          ...data,
          expenses: [
            ...data.expenses,
            { id: uid(), date: f.date, name: f.name, amount: +f.amount },
          ],
        });
      setModal(null);
    } catch (err) {
      setError(err.message);
    }
  }
  async function restore(e) {
    try {
      const d = JSON.parse(await e.target.files[0].text());
      if (
        !Array.isArray(d.items) ||
        !Array.isArray(d.recipes) ||
        !Array.isArray(d.sales) ||
        !Array.isArray(d.expenses)
      )
        throw Error("Invalid backup");
      d.items.forEach((i) => {
        if (
          !i.id ||
          !i.name ||
          !units[i.unit] ||
          !(i.amount > 0) ||
          !(i.price >= 0)
        )
          throw Error("Invalid ingredient");
      });
      d.recipes.forEach((r) => {
        if (!(r.yield > 0) || !Array.isArray(r.lines))
          throw Error("Invalid recipe");
        recipeCost(r, d.items);
      });
      if (confirm("Replace current records with this backup?"))
        save(migrateData(d), true);
    } catch (err) {
      setError("Backup could not be imported: " + err.message);
    }
    e.target.value = "";
  }
  if (locked && lockConfig)
    return (
      <LockScreen
        config={lockConfig}
        onUnlock={() => setLocked(false)}
      />
    );
  return (
    <div className="app">
      <aside>
        <a
          className="brand"
          href="#page=Overview"
          onClick={(e) => {
            e.preventDefault();
            navigate("Overview");
          }}
        >
          <span className="brand-icon">
            <ChefHat />
          </span>
          <span>
            Bakery<span className="brand-light">Ledger</span>
            <small>A little clarity. A lot of growth.</small>
          </span>
        </a>
        <div className="workspace">
          <span className="avatar">B</span>
          <div>
            My bakery<small>Your business workspace</small>
          </div>
          <span className="dot" />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main workspace">
          {sections.map((group, index) => {
            const Icon = [
              LayoutDashboard,
              BookOpen,
              ChefHat,
              ShoppingBasket,
              TrendingUp,
              Settings,
            ][index];
            return (
              <button
                key={group.name}
                className={section.name === group.name ? "active" : ""}
                aria-current={section.name === group.name ? "true" : undefined}
                onClick={() => navigate(group.pages[0])}
              >
                <Icon size={19} />
                {group.name}
              </button>
            );
          })}
        </nav>
        <div className="workspace-guide">
          <p>Quote → Order → Produce → Fulfill</p>
          <small>One connected workflow for your bakery.</small>
        </div>
        <div className="workspace-local">
          <span className="status-dot" /> Saved on this device
          <small>USD · Local workspace</small>
          <button className="text-button" onClick={() => navigate("Backups")}>
            Backups & recovery
          </button>
          <button className="text-button" onClick={() => setShowTutorial(true)}>
            Open tutorial
          </button>
          {lockConfig && (
            <button className="text-button" onClick={() => setLocked(true)}>
              Lock workspace
            </button>
          )}
        </div>
      </aside>
      <main>
        <header>
          <span>
            Workspace <span className="slash">/</span> <b>{section.name}</b>
          </span>
          <div>
            <span className="status-dot" /> Local workspace{" "}
            <span className="header-avatar">B</span>
          </div>
        </header>
        <div className="content">
          {error && !modal && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <div className="page-title">
            <div>
              <div className="eyebrow">{section.name.toUpperCase()}</div>
              <h1 id="workspace-title" tabIndex={-1}>
                {info.label}
              </h1>
              <p>{info.description}</p>
            </div>
            {info.action && (
              <button
                className="primary"
                onClick={() =>
                  open(
                    info.modal,
                    page === "Packaging" ? { type: "packaging" } : undefined,
                  )
                }
              >
                <Plus size={17} />
                {info.action}
              </button>
            )}
          </div>
          {section.pages.length > 1 && (
            <nav
              className="workspace-tabs"
              aria-label={section.name + " pages"}
            >
              {section.pages.map((name) => (
                <button
                  key={name}
                  aria-current={page === name ? "page" : undefined}
                  className={page === name ? "active" : ""}
                  onClick={() => navigate(name)}
                >
                  {pages[name].label}
                </button>
              ))}
            </nav>
          )}
          {info.next && (
            <div className="workflow-handoff">
              <span>
                {page === "Quotes"
                  ? "Customer accepted a quote? Create an order from its saved card."
                  : page === "Orders"
                    ? "Accepted orders create production tasks automatically."
                    : page === "Shopping list"
                      ? "After shopping, receive packages to update on-hand stock."
                      : "Continue your workflow"}
              </span>
              <button
                className="text-button"
                onClick={() => navigate(info.next)}
              >
                {info.nextLabel}
                <ArrowUpRight size={15} />
              </button>
            </div>
          )}
          {page === "Overview" && (
            <section className="today-board" aria-label="Today's work">
              <div>
                <span className="eyebrow">TODAY’S WORK</span>
                <h2>Keep your bakery moving</h2>
              </div>
              <div className="today-grid">
                {[
                  [
                    "Orders",
                    data.orders.filter((o) => o.status === "open").length,
                    "Open orders",
                    "Review payments and pickups",
                  ],
                  [
                    "Daily planner",
                    data.productionPlans
                      .filter(
                        (p) => p.status === "planned" && p.date <= today(),
                      )
                      .reduce((n, p) => n + p.batches, 0),
                    "Batches due",
                    "Includes overdue production",
                  ],
                  [
                    "Waste & expiry",
                    stockAlerts(data).length,
                    "Stock alerts",
                    "Low stock and expiry",
                  ],
                ].map(([target, value, label, hint]) => (
                  <button key={target} onClick={() => navigate(target)}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <small>{hint}</small>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
              </div>
            </section>
          )}
          {page === "Tutorial" ? (
            <TutorialWorkspace
              navigate={navigate}
              startTour={() => setShowTutorial(true)}
            />
          ) : [
            "Calendar",
            "Prep sheets",
            "Inventory lots",
            "Supplier prices",
            "Payments",
            "Tax report",
            "Waste analysis",
            "Owner forecast",
            "Security",
          ].includes(page) ? (
            <OwnerWorkspace
              key={page}
              data={data}
              save={save}
              page={page}
              lockConfig={lockConfig}
              setLockConfig={setLockConfig}
              lockNow={() => setLocked(true)}
            />
          ) : page === "Tax settings" ? (
            <section className="panel planning-form">
              <h2>Purchase tax defaults</h2>
              <dl>
                <dt>Food</dt>
                <dd>{data.taxRates.food}%</dd>
                <dt>Other</dt>
                <dd>{data.taxRates.other}%</dd>
              </dl>
              <h2>Customer sales tax</h2>
              <p>
                Default for new quotes and direct sales:{" "}
                <b>{data.salesTaxRate}%</b>. Recipe selling prices are treated
                as before-tax prices for new direct sales.
              </p>
              <p>
                Purchase defaults apply to new items. Customer sales tax is
                separate. Existing items, quotes, orders and sales retain their
                saved treatment.
              </p>
              <button
                className="secondary"
                onClick={() => navigate("Ingredients")}
              >
                Manage purchase prices
              </button>
            </section>
          ) : [
              "Orders",
              "Shopping list",
              "Waste & expiry",
              "Recipe scaling",
              "Backups",
            ].includes(page) ? (
            <BakeryTools
              key={page + (routeContext.quoteId || "")}
              data={data}
              save={save}
              page={page}
              open={open}
              navigate={navigate}
              context={routeContext}
              restore={restore}
            />
          ) : ["Inventory dashboard", "Quotes", "Daily planner"].includes(
              page,
            ) ? (
            <PlanningWorkspace
              key={page}
              data={data}
              save={save}
              open={open}
              tab={page}
              navigate={navigate}
            />
          ) : [
              "Inventory",
              "Product stock",
              "Can make",
              "Cost settings",
            ].includes(page) ? (
            <Operations data={data} save={save} open={open} tab={page} />
          ) : page === "Overview" ? (
            <>
              <div className="section-top">
                <h2>
                  Business overview <span className="pill">MONTHLY</span>
                </h2>
                <input
                  aria-label="Reporting month"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
              <div className="stats">
                {[
                  [
                    "Total revenue",
                    revenue,
                    "Excludes separately recorded sales tax",
                    "green",
                  ],
                  [
                    "Cost of goods",
                    cogs,
                    "Production incl. labor & overhead",
                    "",
                  ],
                  [
                    "Operating expenses",
                    overhead,
                    "Your day-to-day business costs",
                    "",
                  ],
                  ["Net profit", profit, "Revenue − costs − expenses", "green"],
                ].map(([title, n, hint, c]) => (
                  <div className={"stat " + c} key={title}>
                    <div>
                      {title}
                      <TrendingUp size={17} />
                    </div>
                    <strong>{money(n)}</strong>
                    <small>{hint}</small>
                  </div>
                ))}
              </div>
              <p className="accounting-note">
                Customer sales tax collected:{" "}
                {money(
                  sales.reduce(
                    (n, s) => n + (s.net != null ? s.tax || 0 : 0),
                    0,
                  ),
                )}
                . Excluded from revenue when separately recorded; historical
                sales without a breakdown keep their original totals.
              </p>
              <Dashboard data={data} month={month} />
              <section className="panel transactions">
                <div className="panel-heading">
                  <div>
                    <h2>The latest in your bakery</h2>
                    <p>Your sales and expenses, all in one place.</p>
                  </div>
                  <button className="secondary" onClick={() => open("expense")}>
                    <Plus size={16} />
                    Add expense
                  </button>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>DESCRIPTION</th>
                      <th>DATE</th>
                      <th>TYPE</th>
                      <th>AMOUNT</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...sales.map((s) => ({ ...s, type: "Sale" })),
                      ...expenses.map((s) => ({ ...s, type: "Expense" })),
                    ]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((s) => (
                        <tr key={s.id}>
                          <td>
                            <b>{s.name}</b>
                            {s.quantity && <small>{s.quantity} sold</small>}
                            {s.net != null && (
                              <small>
                                Before tax {money(s.net)} · Sales tax{" "}
                                {money(s.tax || 0)}
                              </small>
                            )}
                          </td>
                          <td>{s.date}</td>
                          <td>
                            <span
                              className={
                                "tag " + (s.type === "Sale" ? "sage" : "")
                              }
                            >
                              {s.type}
                            </span>
                          </td>
                          <td>{money(s.total ?? s.amount)}</td>
                          <td>
                            <button
                              aria-label="Delete transaction"
                              disabled={!!(s.orderId || s.wasteId)}
                              title={
                                s.orderId || s.wasteId
                                  ? "Linked order and waste records are retained for stock consistency"
                                  : "Delete transaction"
                              }
                              className="icon-button"
                              onClick={() => {
                                if (confirm("Delete this transaction?"))
                                  save({
                                    ...data,
                                    products: s.stockTracked
                                      ? {
                                          ...data.products,
                                          [s.recipeId]: {
                                            quantity:
                                              (data.products[s.recipeId]
                                                ?.quantity || 0) + s.quantity,
                                            value:
                                              (data.products[s.recipeId]
                                                ?.value || 0) + s.cost,
                                          },
                                        }
                                      : data.products,
                                    sales: data.sales.filter(
                                      (x) => x.id !== s.id,
                                    ),
                                    expenses: data.expenses.filter(
                                      (x) => x.id !== s.id,
                                    ),
                                  });
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!sales.length && !expenses.length && (
                  <div className="empty">
                    <span>✧</span>
                    <h3>A fresh page for your business</h3>
                    <p>
                      Record your first sale or expense to see your month take
                      shape.
                    </p>
                  </div>
                )}
              </section>
              <div className="footer-note">
                A pinch of planning. A whole lot of possibility.
              </div>
            </>
          ) : (
            <>
              <div className="section-top">
                <h2>
                  {page}{" "}
                  <span className="pill">
                    {page === "Recipes"
                      ? data.recipes.length
                      : data.items.filter(
                          (i) =>
                            i.type ===
                            (page === "Packaging" ? "packaging" : "ingredient"),
                        ).length}{" "}
                    ITEMS
                  </span>
                </h2>
                <div className="search">
                  <Search size={16} />
                  <input
                    placeholder="Search your collection"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>
              {page === "Recipes" ? (
                <div className="recipe-grid">
                  {data.recipes
                    .filter((r) =>
                      r.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((r) => (
                      <section className="panel recipe-card" key={r.id}>
                        <div className="recipe-symbol">
                          <ChefHat size={40} />
                          <span>{r.category}</span>
                        </div>
                        <h2>{r.name}</h2>
                        <p>Makes {r.yield} sellable portions</p>
                        <dl>
                          <dt>Full batch cost</dt>
                          <dd>
                            {cost(r) === null
                              ? "Needs conversion"
                              : money(cost(r))}
                          </dd>
                          <dt>Cost per portion</dt>
                          <dd>
                            {cost(r) === null ? "—" : money(cost(r) / r.yield)}
                          </dd>
                          <dt>Selling price / portion</dt>
                          <dd>{money(r.price)}</dd>
                          <dt>Profit / portion</dt>
                          <dd>
                            {cost(r) === null
                              ? "—"
                              : money(r.price - cost(r) / r.yield)}
                          </dd>
                        </dl>
                        <button
                          className="secondary"
                          onClick={() => open("recipe", r)}
                        >
                          View & edit recipe <ArrowUpRight size={16} />
                        </button>
                      </section>
                    ))}
                </div>
              ) : (
                <section className="panel">
                  <table>
                    <thead>
                      <tr>
                        <th>ITEM</th>
                        <th>PACKAGE SIZE</th>
                        <th>PACKAGE TOTAL</th>
                        <th>TAX</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.items
                        .filter(
                          (i) =>
                            i.type ===
                              (page === "Packaging"
                                ? "packaging"
                                : "ingredient") &&
                            i.name.toLowerCase().includes(query.toLowerCase()),
                        )
                        .map((i) => (
                          <tr key={i.id}>
                            <td>
                              <b>{i.name}</b>
                            </td>
                            <td>
                              {i.amount} {i.unit}
                            </td>
                            <td>
                              {money(purchaseTax(i).total)}
                              <small>
                                Entered {money(i.price)} ·{" "}
                                {purchaseMode(i) === "legacy"
                                  ? "No extra tax (legacy)"
                                  : purchaseMode(i) === "exempt"
                                    ? "Tax exempt"
                                    : `${money(purchaseTax(i).tax)} tax ${purchaseMode(i) === "included" ? "included" : "added"}`}
                              </small>
                            </td>
                            <td>
                              {i.taxCategory === "other" ? "Other" : "Food"} ·{" "}
                              {purchaseMode(i) === "legacy"
                                ? "Legacy treatment"
                                : purchaseMode(i) === "exempt"
                                  ? "Exempt"
                                  : `${i.tax}% ${purchaseMode(i) === "included" ? "included" : "added"}`}
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => open("item", i)}
                              >
                                Edit <ArrowUpRight size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      {modal && (
        <div className="overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") setModal(null);
              if (e.key === "Tab") {
                const nodes = e.currentTarget.querySelectorAll(
                  "button:not(:disabled), input:not([hidden]), select, textarea",
                );
                const first = nodes[0],
                  last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <div className="panel-heading">
              <h2 id="modal-title">
                {modal.type === "tax"
                  ? "Tax settings"
                  : modal.type === "item"
                    ? "Ingredient & packaging details"
                    : modal.type === "recipe"
                      ? "Recipe studio"
                      : modal.type === "sale"
                        ? "Record a sale"
                        : "Record an expense"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={() => setModal(null)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={submit}>
              {modal.type === "tax" ? (
                <>
                  <p className="hint">
                    Saved defaults for new purchases. Existing items and sales
                    retain their rates; edit an item to change its purchase tax.
                  </p>
                  <h3>Purchase-tax defaults</h3>
                  <label>
                    Food purchase tax (%)
                    <input
                      name="food"
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      defaultValue={data.taxRates.food}
                      required
                    />
                  </label>
                  <label>
                    Other purchase tax (%)
                    <input
                      name="other"
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      defaultValue={data.taxRates.other}
                      required
                    />
                  </label>
                  <div className="conversion-box">
                    <h3>Customer sales tax</h3>
                    <p>
                      Separate from tax paid on ingredients. Used for new quotes
                      and direct sales. Recipe selling prices are treated as
                      before-tax prices for new direct sales.
                    </p>
                    <label>
                      Default customer sales tax (%)
                      <input
                        name="salesTaxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        defaultValue={data.salesTaxRate}
                        required
                      />
                    </label>
                    <p className="hint">
                      This does not change saved quotes, accepted orders,
                      historical sales or finished-stock costs.
                    </p>
                  </div>
                </>
              ) : modal.type === "item" ? (
                <ItemFields item={modal.value} taxRates={data.taxRates} />
              ) : modal.type === "recipe" ? (
                <RecipeFields recipe={modal.value} items={data.items} />
              ) : modal.type === "sale" ? (
                <SaleFields data={data} />
              ) : (
                <>
                  <label>
                    Description
                    <input
                      name="name"
                      required
                      placeholder="e.g. Kitchen rent"
                    />
                  </label>
                  <label>
                    Amount ($)
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
                    <input
                      name="date"
                      type="date"
                      defaultValue={today()}
                      required
                    />
                  </label>
                </>
              )}
              {error && <div className="error">{error}</div>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setModal(null)}
                >
                  Cancel
                </button>
                <button className="primary" type="submit">
                  Save {modal.type === "item" ? "item" : modal.type}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {showTutorial && (
        <GuidedTutorial navigate={navigate} onClose={closeTutorial} />
      )}
    </div>
  );
}
function UnitSelect({ name, value, onChange }) {
  return (
    <select name={name} defaultValue={value || "g"} onChange={onChange}>
      {Object.keys(units).map((u) => (
        <option key={u}>{u}</option>
      ))}
    </select>
  );
}
function ItemFields({ item: i = {}, taxRates }) {
  const [mode, setMode] = useState(i.id ? purchaseMode(i) : "added"),
    [price, setPrice] = useState(i.price ?? ""),
    [category, setCategory] = useState(
      i.taxCategory || (i.type === "packaging" ? "other" : "food"),
    ),
    [rate, setRate] = useState(
      i.tax ?? taxRates[i.type === "packaging" ? "other" : "food"],
    );
  let taxDetails;
  try {
    taxDetails = purchaseTax({ price, tax: rate, taxMode: mode });
  } catch {}
  function chooseTax(value) {
    setCategory(value);
    setRate(taxRates[value]);
  }
  return (
    <>
      <label>
        Item name
        <input
          name="name"
          defaultValue={i.name}
          required
          placeholder="e.g. All-purpose flour"
        />
      </label>
      <label>
        Category
        <select
          name="type"
          defaultValue={i.type || "ingredient"}
          onChange={(e) =>
            chooseTax(e.target.value === "packaging" ? "other" : "food")
          }
        >
          <option value="ingredient">Ingredient</option>
          <option value="packaging">Packaging</option>
        </select>
      </label>
      <div className="form-row">
        <label>
          Net package quantity
          <input
            name="amount"
            type="number"
            min="0.001"
            step="any"
            defaultValue={i.amount}
            required
          />
        </label>
        <label>
          Unit
          <UnitSelect name="unit" value={i.unit} />
        </label>
      </div>
      <label>
        Package price ($)
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />
      </label>
      <div className="form-row">
        <label>
          Tax category
          <select
            name="taxCategory"
            value={category}
            onChange={(e) => chooseTax(e.target.value)}
          >
            <option value="food">Food</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Purchase tax treatment
          <select
            name="taxMode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="added">Add tax to this price</option>
            <option value="included">Tax already included</option>
            <option value="exempt">Tax exempt / no tax</option>
            {mode === "legacy" && (
              <option value="legacy">Previously saved: no extra tax</option>
            )}
          </select>
        </label>
      </div>
      {mode === "legacy" && (
        <p className="hint">
          This older item did not distinguish included tax from exemption. Its
          cost stays unchanged until you choose a treatment.
        </p>
      )}
      {mode === "added" || mode === "included" ? (
        <label>
          Purchase tax rate (%)
          <input
            name="tax"
            type="number"
            min="0"
            max="100"
            step="any"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            required
          />
        </label>
      ) : (
        <input type="hidden" name="tax" value={rate} />
      )}
      <p className="hint">
        Food and Other rates are purchase defaults only. Editing this item does
        not change those defaults or customer sales tax.
      </p>
      {taxDetails && (
        <div className="tax-breakdown" role="status">
          <h3>Package cost breakdown</h3>
          <dl>
            <dt>{mode === "legacy" ? "Entered price" : "Before-tax price"}</dt>
            <dd>{money(taxDetails.base)}</dd>
            <dt>
              {mode === "legacy"
                ? "Additional tax"
                : mode === "exempt"
                  ? "Tax (exempt)"
                  : `Purchase tax (${rate}%)`}
            </dt>
            <dd>{money(taxDetails.tax)}</dd>
            <dt>Final package cost</dt>
            <dd>{money(taxDetails.total)}</dd>
          </dl>
          <small>
            Used in recipe costs, stock value and purchase estimates.
          </small>
        </div>
      )}
      <div className="conversion-box">
        <h3>Stock planning</h3>
        <label>
          Supplier
          <input
            name="supplier"
            defaultValue={i.supplier || ""}
            placeholder="Supplier name"
          />
        </label>
        <label>
          Minimum on hand (purchase unit)
          <input
            name="minStock"
            type="number"
            min="0"
            step="any"
            defaultValue={i.minStock || 0}
          />
        </label>
        <label>
          Current stock expiry
          <input
            name="expiryDate"
            type="date"
            defaultValue={i.expiryDate || ""}
          />
        </label>
        <p className="hint">
          Expiry applies to the current stock as a whole; update it when
          receiving new stock.
        </p>
        <h3>Can size</h3>
        <p>
          Use “can” in purchases or recipes. Set the net weight from your
          brand’s label; condensed and evaporated milk often use different can
          sizes.
        </p>
        <label>
          Grams per can
          <input
            name="gramsPerCan"
            type="number"
            min="0.001"
            step="any"
            defaultValue={i.gramsPerCan}
            placeholder="e.g. 397 condensed / 354 evaporated"
          />
        </label>
        <h3>Cup-to-weight conversion</h3>
        <p>
          How much does one US cup of this ingredient weigh? This lets us cost
          cups against a bag sold in grams or kilograms.
        </p>
        <label>
          Grams per cup
          <input
            name="gramsPerCup"
            type="number"
            min="0.001"
            step="any"
            defaultValue={i.gramsPerCup}
            placeholder="e.g. 120 for all-purpose flour"
          />
        </label>
        <p className="hint">
          Example: a 2 kg bag at $5, with 120 g per cup → 2 cups use 240 g and
          cost $0.60 before extra tax. Weigh your own ingredient for the most
          accurate result.
        </p>
        <details>
          <summary>Advanced: density and individual pieces</summary>
          <label>
            Grams per piece (optional)
            <input
              name="gramsPerEach"
              type="number"
              min="0.001"
              step="any"
              defaultValue={i.gramsPerEach}
              placeholder="e.g. 50 for a shelled egg"
            />
          </label>
          <label>
            Density (g/ml), optional
            <input
              name="density"
              type="number"
              min="0.001"
              step="any"
              defaultValue={i.density}
              placeholder="Used when grams per cup is not set"
            />
          </label>
        </details>
      </div>
      <p className="hint">
        US cups and spoons. Use “each” for individual containers and utensils.
        Grams per cup takes priority over density.
      </p>
    </>
  );
}
function RecipeFields({ recipe: r = {}, items }) {
  const [lines, setLines] = useState(
      (r.lines || []).map((l) => ({ ...l, key: uid() })),
    ),
    [yieldN, setYield] = useState(r.yield || 1);
  let total = 0;
  return (
    <>
      <label>
        Recipe name
        <input
          name="name"
          defaultValue={r.name}
          required
          placeholder="e.g. Tres leches cups"
        />
      </label>
      <div className="form-row">
        <label>
          Category
          <input
            name="category"
            defaultValue={r.category || "Desserts"}
            required
          />
        </label>
        <label>
          Sellable portions
          <input
            name="yield"
            type="number"
            min="1"
            step="1"
            value={yieldN}
            onChange={(e) => setYield(+e.target.value)}
            required
          />
        </label>
      </div>
      <label>
        Selling price per portion ($)
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          defaultValue={r.price || 0}
          required
        />
      </label>
      <label>
        Allergens
        <input
          name="allergens"
          defaultValue={r.allergens || ""}
          placeholder="e.g. Milk, eggs, wheat, peanuts"
        />
      </label>
      <div className="conversion-box">
        <h3>Batch labor & overhead</h3>
        <p>
          Set wage and electricity rates in Settings → Production costs. These
          allocations are included in production cost.
        </p>
        <div className="form-row">
          <label>
            Labor minutes
            <input
              name="laborMinutes"
              type="number"
              min="0"
              step="any"
              defaultValue={r.laborMinutes || 0}
            />
          </label>
          <label>
            Electricity (kWh)
            <input
              name="electricityKwh"
              type="number"
              min="0"
              step="any"
              defaultValue={r.electricityKwh || 0}
            />
          </label>
          <label>
            Other overhead ($/batch)
            <input
              name="overheadPerBatch"
              type="number"
              min="0"
              step="0.01"
              defaultValue={r.overheadPerBatch || 0}
            />
          </label>
        </div>
      </div>
      <h3>Ingredients & packaging</h3>
      <p className="hint">
        Enter quantities for the whole batch, including boxes, utensils, and
        napkins. Cost reflects the amount used; packages show what you need to
        buy.
      </p>
      {lines.map((l, index) => {
        let result, err;
        try {
          result = lineCost(l, items);
          total += result.cost;
        } catch (e) {
          err = e.message;
        }
        const update = (patch) =>
          setLines(lines.map((x, n) => (n === index ? { ...x, ...patch } : x)));
        return (
          <div className="recipe-line" data-line key={l.key}>
            <select
              name="itemId"
              value={l.itemId}
              onChange={(e) => update({ itemId: e.target.value })}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.type === "packaging" ? "(packaging)" : ""}
                </option>
              ))}
            </select>
            <div className="line-amount">
              <input
                aria-label="Recipe quantity"
                name="quantity"
                type="number"
                min="0.001"
                step="any"
                value={l.amount}
                onChange={(e) => update({ amount: +e.target.value })}
                required
              />
              <UnitSelect
                name="lineUnit"
                value={l.unit}
                onChange={(e) => update({ unit: e.target.value })}
              />
              <button
                type="button"
                className="icon-button"
                aria-label="Remove recipe item"
                onClick={() => setLines(lines.filter((_, n) => n !== index))}
              >
                <Trash2 size={17} />
              </button>
            </div>
            <small className={err ? "error" : "hint"}>
              {err ||
                `${money(result.cost)} used (${Number(result.needed.toFixed(3))} ${result.unit}) · ${result.packs} package(s) to buy (${money(result.purchase)})`}
            </small>
          </div>
        );
      })}
      <button
        type="button"
        className="secondary"
        disabled={!items.length}
        onClick={() =>
          setLines([
            ...lines,
            { key: uid(), itemId: items[0].id, amount: 1, unit: items[0].unit },
          ])
        }
      >
        <Plus size={16} />
        Add ingredient or packaging
      </button>
      <div className="cost-summary">
        <span>
          Ingredients & packaging <b>{money(total)}</b>
        </span>
        <span>
          Per portion <b>{yieldN > 0 ? money(total / yieldN) : "—"}</b>
        </span>
      </div>
    </>
  );
}
function LockScreen({ config, onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  return (
    <main className="lock-screen">
      <section className="panel lock-card">
        <span className="brand-icon"><ChefHat /></span>
        <span className="eyebrow">OWNER WORKSPACE</span>
        <h1>Bakery Ledger is locked</h1>
        <p>Enter your local PIN to continue.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              if (await verifyPin(pin, config)) {
                setError("");
                onUnlock();
              } else setError("Incorrect PIN.");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <label>
            PIN
            <input
              autoFocus
              aria-label="Owner PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              required
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="primary">Unlock workspace</button>
        </form>
      </section>
    </main>
  );
}
createRoot(document.getElementById("root")).render(<App />);
