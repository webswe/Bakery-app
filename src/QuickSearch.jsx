import React, { forwardRef, useDeferredValue, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { pages } from "./workspaceNavigation.js";

const QuickSearch = forwardRef(function QuickSearch({ data, navigate }, ref) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const deferred = useDeferredValue(query.trim().toLocaleLowerCase());
  const results = useMemo(() => {
    const rows = [
      ...Object.entries(pages).map(([page, info]) => ({ type: "Page", label: info.label, detail: info.description, page })),
      ...(data.recipes || []).map((recipe) => ({ type: "Recipe", label: recipe.name, detail: `${recipe.category || "Recipe"} · ${recipe.yield} portions`, page: "Recipes" })),
      ...(data.items || []).map((item) => ({ type: item.type === "packaging" ? "Packaging" : "Ingredient", label: item.name, detail: `${item.stock || 0} ${item.unit} on hand`, page: item.type === "packaging" ? "Packaging" : "Ingredients" })),
      ...(data.customers || []).map((customer) => ({ type: "Customer", label: customer.name, detail: [customer.phone, customer.email].filter(Boolean).join(" · "), page: "Customers", context: { customerId: customer.id } })),
      ...(data.orders || []).map((order) => ({ type: "Order", label: order.customer || order.recipeName, detail: `${order.recipeName} · pickup ${order.pickupDate}`, page: "Orders", context: { orderId: order.id } })),
    ];
    if (!deferred) return rows.filter((row) => row.type === "Page").slice(0, 8);
    return rows.filter((row) => `${row.type} ${row.label} ${row.detail}`.toLocaleLowerCase().includes(deferred)).slice(0, 12);
  }, [data, deferred]);
  const choose = (result) => {
    navigate(result.page, result.context || {});
    setQuery("");
    setOpen(false);
  };
  return (
    <div className="quick-search" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <Search size={16} />
      <input ref={ref} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.currentTarget.blur(); } if (event.key === "Enter" && results[0]) choose(results[0]); }} placeholder="Find anything…" aria-label="Search pages, recipes, inventory, customers and orders" aria-expanded={open} />
      {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}
      <kbd>⌘/Ctrl K</kbd>
      {open && <div className="quick-search-results" role="listbox">
        {results.map((result, index) => <button type="button" role="option" key={`${result.type}-${result.label}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(result)}><span><b>{result.label}</b><small>{result.detail}</small></span><em>{result.type}</em></button>)}
        {!results.length && <p>No matching pages or records.</p>}
      </div>}
    </div>
  );
});

export default QuickSearch;
