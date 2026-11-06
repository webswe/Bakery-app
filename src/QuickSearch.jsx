import React, {
  forwardRef,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Search, X } from "lucide-react";
import { pages } from "./workspaceNavigation.js";

const QuickSearch = forwardRef(function QuickSearch(
  { data, navigate, openAction, recentPages = [] },
  ref,
) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const container = useRef(null);
  const deferred = useDeferredValue(query.trim().toLocaleLowerCase());
  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside, true);
    return () =>
      document.removeEventListener("pointerdown", closeOutside, true);
  }, [open]);
  const results = useMemo(() => {
    const rows = [
      {
        type: "Action",
        label: "Record a sale",
        detail: "Quick add",
        action: "sale",
      },
      {
        type: "Action",
        label: "Add an expense",
        detail: "Quick add",
        action: "expense",
      },
      {
        type: "Action",
        label: "Add inventory item",
        detail: "Quick add",
        action: "item",
      },
      {
        type: "Action",
        label: "Create a recipe",
        detail: "Quick add",
        action: "recipe",
      },
      ...Object.entries(pages).map(([page, info]) => ({
        type: "Page",
        label: info.label,
        detail: info.description,
        page,
      })),
      ...(data.recipes || []).map((recipe) => ({
        type: "Recipe",
        label: recipe.name,
        detail: `${recipe.category || "Recipe"} · ${recipe.yield} portions`,
        page: "Recipes",
      })),
      ...(data.items || []).map((item) => ({
        type: item.type === "packaging" ? "Packaging" : "Ingredient",
        label: item.name,
        detail: `${item.stock || 0} ${item.unit} on hand`,
        page: item.type === "packaging" ? "Packaging" : "Ingredients",
      })),
      ...(data.customers || []).map((customer) => ({
        type: "Customer",
        label: customer.name,
        detail: [customer.phone, customer.email].filter(Boolean).join(" · "),
        page: "Customers",
        context: { customerId: customer.id },
      })),
      ...(data.orders || []).map((order) => ({
        type: "Order",
        label: order.customer || order.recipeName,
        detail: `${order.recipeName} · pickup ${order.pickupDate}`,
        page: "Orders",
        context: { orderId: order.id },
      })),
    ];
    if (!deferred) {
      const recent = recentPages
        .map((page) =>
          rows.find((row) => row.type === "Page" && row.page === page),
        )
        .filter(Boolean);
      return [
        ...rows.filter((row) => row.type === "Action"),
        ...recent,
        ...rows.filter((row) => row.type === "Page" && !recent.includes(row)),
      ].slice(0, 10);
    }
    return rows
      .filter((row) =>
        `${row.type} ${row.label} ${row.detail}`
          .toLocaleLowerCase()
          .includes(deferred),
      )
      .slice(0, 12);
  }, [data, deferred, recentPages]);
  const choose = (result) => {
    if (result.action) openAction(result.action);
    else navigate(result.page, result.context || {});
    setQuery("");
    setOpen(false);
  };
  return (
    <div className="quick-search" ref={container}>
      <Search size={16} />
      <input
        ref={ref}
        value={query}
        onPointerDown={(event) => event.currentTarget.focus()}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            event.currentTarget.blur();
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((value) => Math.min(results.length - 1, value + 1));
          }
          if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((value) => Math.max(0, value - 1));
          }
          if (event.key === "Enter" && results[active]) choose(results[active]);
        }}
        placeholder="Find or run a command…"
        aria-label="Search pages and records or run an action"
        aria-expanded={open}
        aria-activedescendant={
          open && results[active] ? `quick-result-${active}` : undefined
        }
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setQuery("")}
        >
          <X size={14} />
        </button>
      )}
      <kbd>⌘/Ctrl K</kbd>
      {open && (
        <div className="quick-search-results" role="listbox">
          {results.map((result, index) => (
            <button
              id={`quick-result-${index}`}
              type="button"
              role="option"
              aria-selected={active === index}
              className={active === index ? "active" : ""}
              key={`${result.type}-${result.label}-${index}`}
              onMouseEnter={() => setActive(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(result)}
            >
              <span>
                <b>{result.label}</b>
                <small>{result.detail}</small>
              </span>
              <em>{result.type}</em>
            </button>
          ))}
          {!results.length && <p>No matching pages or records.</p>}
        </div>
      )}
    </div>
  );
});

export default QuickSearch;
