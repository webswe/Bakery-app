import React from "react";
import { expenseCategories, expensePaymentMethods } from "./expenses.js";
import { localDay } from "./uiFormatters.js";

export default function ExpenseFields({ expense }) {
  return (
    <>
      <p className="hint">
        Use this for overhead such as rent, utilities, payroll, marketing, fees,
        and repairs. Stock purchases are already recorded during receiving.
      </p>
      <label>
        Description
        <input
          name="name"
          defaultValue={expense?.name || ""}
          placeholder="e.g. Kitchen rent"
          required
        />
      </label>
      <div className="form-row">
        <label>
          Amount ($)
          <input
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={expense?.amount ?? ""}
            required
          />
        </label>
        <label>
          Date
          <input
            name="date"
            type="date"
            defaultValue={expense?.date || localDay()}
            required
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Category
          <select name="category" defaultValue={expense?.category || "Other"}>
            {expenseCategories.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Payment method
          <select
            name="paymentMethod"
            defaultValue={expense?.paymentMethod || "Card"}
          >
            {expensePaymentMethods.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Vendor or payee
        <input
          name="vendor"
          defaultValue={expense?.vendor || ""}
          placeholder="Optional"
        />
      </label>
      <label>
        Notes
        <textarea
          name="notes"
          defaultValue={expense?.notes || ""}
          placeholder="Invoice number, purpose, or reminder"
        />
      </label>
    </>
  );
}
