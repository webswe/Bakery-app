import React, {
  memo,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ArrowUpRight, ChefHat, Printer, Search, Trash2 } from "lucide-react";
import { recipeRemovalStatus } from "./bakeryOperations.js";
import { purchaseMode, purchaseTax } from "./taxation.js";
import { recipeCostDetails, recipeSaleDetails } from "./recipePricing.js";
import { money } from "./uiFormatters.js";

function CatalogWorkspace({
  data,
  page,
  open,
  recipeCost,
  save,
  removeRecipe,
}) {
  const storageKey = `bakery-ledger-catalog-${page.toLocaleLowerCase().replaceAll(" ", "-")}`;
  const [query, setQuery] = useState(
    () => localStorage.getItem(`${storageKey}-query`) || "",
  );
  const [sort, setSort] = useState(
    () => localStorage.getItem(`${storageKey}-sort`) || "name",
  );
  const [selected, setSelected] = useState([]);
  useEffect(
    () => localStorage.setItem(`${storageKey}-query`, query),
    [query, storageKey],
  );
  useEffect(
    () => localStorage.setItem(`${storageKey}-sort`, sort),
    [sort, storageKey],
  );
  const deferredQuery = useDeferredValue(query).toLocaleLowerCase();
  const rows = useMemo(
    () =>
      page === "Recipes"
        ? data.recipes.filter((recipe) =>
            recipe.name.toLocaleLowerCase().includes(deferredQuery),
          )
        : data.items.filter(
            (item) =>
              item.type ===
                (page === "Packaging" ? "packaging" : "ingredient") &&
              item.name.toLocaleLowerCase().includes(deferredQuery),
          ),
    [data.items, data.recipes, deferredQuery, page],
  );
  const sortedRows = [...rows].sort((a, b) =>
    sort === "price"
      ? page === "Recipes"
        ? recipeSaleDetails(b).salePrice - recipeSaleDetails(a).salePrice
        : Number(b.price || 0) - Number(a.price || 0)
      : sort === "stock"
        ? Number(b.stock || 0) - Number(a.stock || 0)
        : a.name.localeCompare(b.name),
  );
  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  const printSelected = () => {
    document.documentElement.dataset.bulkPrint = "true";
    window.print();
    delete document.documentElement.dataset.bulkPrint;
  };
  return (
    <>
      <div className="section-top">
        <h2>
          {page} <span className="pill">{rows.length} ITEMS</span>
        </h2>
        <div className="catalog-tools">
          <select
            aria-label={`Sort ${page}`}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="name">Name A–Z</option>
            <option value="price">Highest price</option>
            <option value="stock">Most on hand</option>
          </select>
          <div className="search">
            <Search size={16} />
            <input
              aria-label={`Search ${page}`}
              placeholder="Search your collection"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="bulk-action-bar">
          <b>{selected.length} selected</b>
          <button className="secondary" onClick={printSelected}>
            <Printer size={15} />
            Print selected
          </button>
          <button className="text-button" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}
      {page === "Recipes" ? (
        <RecipeResults
          rows={sortedRows}
          open={open}
          recipeCost={recipeCost}
          data={data}
          save={save}
          removeRecipe={removeRecipe}
          selected={selected}
          toggle={toggle}
        />
      ) : (
        <ItemResults
          rows={sortedRows}
          open={open}
          selected={selected}
          toggle={toggle}
        />
      )}
      {!rows.length && (
        <div className="panel empty">
          <h3>No matching {page.toLocaleLowerCase()}</h3>
          <p>Clear the saved search or add a new record.</p>
          <div className="planning-actions">
            <button className="secondary" onClick={() => setQuery("")}>
              Clear search
            </button>
            <button
              className="primary"
              onClick={() =>
                open(
                  page === "Recipes" ? "recipe" : "item",
                  page === "Packaging" ? { type: "packaging" } : undefined,
                )
              }
            >
              Add {page === "Recipes" ? "recipe" : "item"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const RecipeResults = memo(function RecipeResults({
  rows,
  open,
  recipeCost,
  data,
  save,
  selected,
  toggle,
  removeRecipe,
}) {
  return (
    <div className="recipe-grid">
      {rows.map((recipe) => {
        const cost = recipeCost(recipe);
        const sale = recipeSaleDetails(recipe);
        let details = null;
        try {
          details = recipeCostDetails(recipe, data.items, data.settings);
        } catch {
          /* card retains the conversion warning */
        }
        const packagingLines = recipe.lines.filter(
          (line) =>
            data.items.find((item) => item.id === line.itemId)?.type ===
            "packaging",
        ).length;
        const removal = recipeRemovalStatus(data, recipe.id);
        const removalHint = removal.blockers.length
          ? `Remove ${removal.blockers.join(", ")} first.`
          : `Remove ${recipe.name}`;
        return (
          <section
            className={`panel recipe-card selectable-record ${selected.includes(recipe.id) ? "selected print-selected" : ""}`}
            key={recipe.id}
          >
            <label className="record-select">
              <input
                type="checkbox"
                checked={selected.includes(recipe.id)}
                onChange={() => toggle(recipe.id)}
              />
              <span className="sr-only">Select {recipe.name}</span>
            </label>
            <div className="recipe-symbol">
              <ChefHat size={40} />
              <span>{recipe.category}</span>
            </div>
            <div className="recipe-card-title">
              <div>
                <h2>{recipe.name}</h2>
                <p>Makes {recipe.yield} sellable portions</p>
              </div>
              <span className="sale-format-badge">
                {sale.quantity > 1
                  ? `${sale.quantity} / ${sale.label}`
                  : sale.label}
              </span>
            </div>
            <p>
              Prep {recipe.prepMinutes || 0} min · Bake{" "}
              {recipe.bakeMinutes || 0} min · Cool {recipe.coolingMinutes || 0}{" "}
              min
              {recipe.shelfLifeDays
                ? ` · ${recipe.shelfLifeDays}-day shelf life`
                : ""}
            </p>
            <div className="recipe-cost-breakdown">
              <div>
                <span>Ingredients</span>
                <b>{details ? money(details.ingredients) : "—"}</b>
              </div>
              <div>
                <span>Packaging</span>
                <b>{details ? money(details.packaging) : "—"}</b>
                <small>
                  {packagingLines
                    ? `${packagingLines} packaging line${packagingLines === 1 ? "" : "s"}`
                    : "No packaging added"}
                </small>
              </div>
              <div>
                <span>Labor + utilities</span>
                <b>
                  {details
                    ? money(
                        details.labor + details.electricity + details.overhead,
                      )
                    : "—"}
                </b>
              </div>
            </div>
            <dl className="recipe-pricing-summary">
              <dt>Full batch cost</dt>
              <dd>{cost === null ? "Needs conversion" : money(cost)}</dd>
              <dt>True cost / dessert</dt>
              <dd>{details ? money(details.perPortion) : "—"}</dd>
              <dt>Price / {sale.label}</dt>
              <dd>
                <input
                  className="inline-money"
                  aria-label={`Price per ${sale.label} for ${recipe.name}`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={sale.salePrice}
                  onBlur={(event) => {
                    const salePrice = Number(event.target.value);
                    if (
                      Number.isFinite(salePrice) &&
                      salePrice >= 0 &&
                      salePrice !== sale.salePrice
                    )
                      save({
                        ...data,
                        recipes: data.recipes.map((item) =>
                          item.id === recipe.id
                            ? {
                                ...item,
                                salePrice,
                                price: salePrice / sale.quantity,
                              }
                            : item,
                        ),
                      });
                  }}
                />
              </dd>
              {sale.quantity > 1 && (
                <>
                  <dt>Equivalent / dessert</dt>
                  <dd>{money(sale.unitPrice)}</dd>
                </>
              )}
              <dt>Expected batch revenue</dt>
              <dd>{details ? money(details.revenue) : "—"}</dd>
              <dt>Expected batch profit</dt>
              <dd
                className={details?.profit < 0 ? "negative" : "positive-text"}
              >
                {details ? money(details.profit) : "—"}
              </dd>
              <dt>Gross margin</dt>
              <dd className={details?.margin < 0 ? "negative" : ""}>
                {details ? `${details.margin.toFixed(1)}%` : "—"}
              </dd>
            </dl>
            <div className="recipe-card-actions">
              <button
                className="secondary"
                onClick={() => open("recipe", recipe)}
              >
                Edit recipe <ArrowUpRight size={16} />
              </button>
              <button
                className="text-button"
                onClick={() =>
                  open("recipe", {
                    ...structuredClone(recipe),
                    id: undefined,
                    name: `${recipe.name} copy`,
                  })
                }
              >
                Duplicate
              </button>
              <button
                className="text-button recipe-remove"
                disabled={removal.blockers.length > 0}
                title={removalHint}
                onClick={() => {
                  if (
                    confirm(
                      `Remove “${recipe.name}”? Its recipe history will also be removed. You can undo this immediately from the confirmation bar.`,
                    )
                  )
                    removeRecipe(recipe);
                }}
              >
                <Trash2 size={15} />
                Remove
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
});

const ItemResults = memo(function ItemResults({
  rows,
  open,
  selected,
  toggle,
}) {
  return (
    <section className="panel table-scroll">
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
          {rows.map((item) => (
            <tr
              key={item.id}
              className={`selectable-record ${selected.includes(item.id) ? "selected print-selected" : ""}`}
            >
              <td>
                <label className="table-select">
                  <input
                    type="checkbox"
                    checked={selected.includes(item.id)}
                    onChange={() => toggle(item.id)}
                  />
                  <b>{item.name}</b>
                </label>
              </td>
              <td>
                {item.amount} {item.unit}
              </td>
              <td>
                {money(purchaseTax(item).total)}
                <small>
                  Entered {money(item.price)} ·{" "}
                  {purchaseMode(item) === "legacy"
                    ? "No extra tax (legacy)"
                    : purchaseMode(item) === "exempt"
                      ? "Tax exempt"
                      : `${money(purchaseTax(item).tax)} tax ${purchaseMode(item) === "included" ? "included" : "added"}`}
                </small>
              </td>
              <td>
                {item.taxCategory === "other" ? "Other" : "Food"} ·{" "}
                {purchaseMode(item) === "legacy"
                  ? "Legacy treatment"
                  : purchaseMode(item) === "exempt"
                    ? "Exempt"
                    : `${item.tax}% ${purchaseMode(item) === "included" ? "included" : "added"}`}
              </td>
              <td>
                <button
                  className="text-button"
                  onClick={() => open("item", item)}
                >
                  Edit <ArrowUpRight size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
});

export default memo(CatalogWorkspace);
