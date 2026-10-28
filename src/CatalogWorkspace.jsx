import React, { memo, useDeferredValue, useMemo, useState } from "react";
import { ArrowUpRight, ChefHat, Search } from "lucide-react";
import { purchaseMode, purchaseTax } from "./taxation.js";

const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

function CatalogWorkspace({ data, page, open, recipeCost }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query).toLocaleLowerCase();
  const rows = useMemo(
    () =>
      page === "Recipes"
        ? data.recipes.filter((recipe) => recipe.name.toLocaleLowerCase().includes(deferredQuery))
        : data.items.filter(
            (item) =>
              item.type === (page === "Packaging" ? "packaging" : "ingredient") &&
              item.name.toLocaleLowerCase().includes(deferredQuery),
          ),
    [data.items, data.recipes, deferredQuery, page],
  );
  return (
    <>
      <div className="section-top">
        <h2>{page} <span className="pill">{rows.length} ITEMS</span></h2>
        <div className="search">
          <Search size={16} />
          <input aria-label={`Search ${page}`} placeholder="Search your collection" value={query} onPointerDown={(event) => event.currentTarget.focus()} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </div>
      {page === "Recipes" ? (
        <RecipeResults rows={rows} open={open} recipeCost={recipeCost} />
      ) : (
        <ItemResults rows={rows} open={open} />
      )}
      {!rows.length && <p className="panel empty">No matching {page.toLocaleLowerCase()}.</p>}
    </>
  );
}

const RecipeResults = memo(function RecipeResults({ rows, open, recipeCost }) {
  return (
    <div className="recipe-grid">
      {rows.map((recipe) => {
        const cost = recipeCost(recipe);
        return (
          <section className="panel recipe-card" key={recipe.id}>
            <div className="recipe-symbol"><ChefHat size={40} /><span>{recipe.category}</span></div>
            <h2>{recipe.name}</h2>
            <p>Makes {recipe.yield} sellable portions</p>
            <p>Prep {recipe.prepMinutes || 0} min · Bake {recipe.bakeMinutes || 0} min · Cool {recipe.coolingMinutes || 0} min{recipe.shelfLifeDays ? ` · ${recipe.shelfLifeDays}-day shelf life` : ""}</p>
            <dl>
              <dt>Full batch cost</dt><dd>{cost === null ? "Needs conversion" : money(cost)}</dd>
              <dt>Cost per portion</dt><dd>{cost === null ? "—" : money(cost / recipe.yield)}</dd>
              <dt>Selling price / portion</dt><dd>{money(recipe.price)}</dd>
              <dt>Profit / portion</dt><dd>{cost === null ? "—" : money(recipe.price - cost / recipe.yield)}</dd>
            </dl>
            <div className="recipe-card-actions">
              <button className="secondary" onClick={() => open("recipe", recipe)}>Edit recipe <ArrowUpRight size={16} /></button>
              <button className="text-button" onClick={() => open("recipe", { ...structuredClone(recipe), id: undefined, name: `${recipe.name} copy` })}>Duplicate</button>
            </div>
          </section>
        );
      })}
    </div>
  );
});

const ItemResults = memo(function ItemResults({ rows, open }) {
  return (
    <section className="panel table-scroll">
      <table>
        <thead><tr><th>ITEM</th><th>PACKAGE SIZE</th><th>PACKAGE TOTAL</th><th>TAX</th><th /></tr></thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id}>
              <td><b>{item.name}</b></td>
              <td>{item.amount} {item.unit}</td>
              <td>{money(purchaseTax(item).total)}<small>Entered {money(item.price)} · {purchaseMode(item) === "legacy" ? "No extra tax (legacy)" : purchaseMode(item) === "exempt" ? "Tax exempt" : `${money(purchaseTax(item).tax)} tax ${purchaseMode(item) === "included" ? "included" : "added"}`}</small></td>
              <td>{item.taxCategory === "other" ? "Other" : "Food"} · {purchaseMode(item) === "legacy" ? "Legacy treatment" : purchaseMode(item) === "exempt" ? "Exempt" : `${item.tax}% ${purchaseMode(item) === "included" ? "included" : "added"}`}</td>
              <td><button className="text-button" onClick={() => open("item", item)}>Edit <ArrowUpRight size={15} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
});

export default memo(CatalogWorkspace);
