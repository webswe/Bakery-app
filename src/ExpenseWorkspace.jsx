import React, { useMemo, useState } from "react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import {
  expenseCategories,
  expenseCsv,
  expenseLedger,
  expenseSummary,
  removeExpense,
} from "./expenses.js";
import { localDay, money } from "./uiFormatters.js";
import "./ExpenseWorkspace.css";

function downloadCsv(content, month) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Bakery-Ledger-expenses-${month || "all"}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ExpenseWorkspace({ data, save, open }) {
  const [month, setMonth] = useState(localDay().slice(0, 7));
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () => expenseLedger(data, { month, category, query }),
    [data, month, category, query],
  );
  const summary = useMemo(() => expenseSummary(rows), [rows]);

  return (
    <div className="expense-workspace">
      <section className="panel expense-toolbar">
        <div>
          <span className="eyebrow">OPERATING COSTS</span>
          <h2>Expense ledger</h2>
          <p>
            Track overhead here. Ingredient and packaging purchases are already
            captured when stock is received, so do not enter them twice.
          </p>
        </div>
        <div className="expense-toolbar-actions">
          <button
            className="secondary"
            disabled={!rows.length}
            onClick={() => downloadCsv(expenseCsv(rows), month)}
          >
            <Download size={16} />
            Export CSV
          </button>
          <button className="primary" onClick={() => open("expense")}>
            <Plus size={16} />
            Add expense
          </button>
        </div>
      </section>

      <div className="stats expense-stats">
        <div className="stat">
          <small>FILTERED TOTAL</small>
          <strong>{money(summary.total)}</strong>
          <span>{month || "All dates"}</span>
        </div>
        <div className="stat">
          <small>RECORDS</small>
          <strong>{summary.count}</strong>
          <span>Matching expenses</span>
        </div>
        <div className="stat">
          <small>LARGEST CATEGORY</small>
          <strong>{summary.largest?.name || "—"}</strong>
          <span>
            {summary.largest ? money(summary.largest.amount) : "No expenses"}
          </span>
        </div>
      </div>

      <section className="panel">
        <div className="expense-filters">
          <label>
            Month
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </label>
          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>All</option>
              {expenseCategories.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="expense-search">
            Search
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Description, vendor, payment, or note"
            />
          </label>
        </div>

        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>DATE</th>
                <th>DESCRIPTION</th>
                <th>CATEGORY</th>
                <th>VENDOR</th>
                <th>PAYMENT</th>
                <th>AMOUNT</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>
                    <b>{expense.name}</b>
                    {expense.notes && <small>{expense.notes}</small>}
                  </td>
                  <td>
                    <span className="tag">{expense.category || "Other"}</span>
                  </td>
                  <td>{expense.vendor || "—"}</td>
                  <td>{expense.paymentMethod || "—"}</td>
                  <td>
                    <b>{money(expense.amount)}</b>
                  </td>
                  <td>
                    <div className="expense-row-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${expense.name}`}
                        title="Edit expense"
                        onClick={() => open("expense", expense)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Delete ${expense.name}`}
                        title="Delete expense"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete the ${expense.name} expense? This changes financial reports.`,
                            )
                          )
                            save(removeExpense(data, expense.id));
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className="empty">
            <span>✧</span>
            <h3>No matching expenses</h3>
            <p>Change the filters or add an operating expense.</p>
          </div>
        )}
      </section>
    </div>
  );
}
