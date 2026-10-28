import React, { useDeferredValue, useMemo, useState } from "react";
import { customerActivity, saveCustomer } from "./customerOps.js";

const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

export default function CustomerWorkspace({ data, save, navigate }) {
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query).toLocaleLowerCase();
  const [error, setError] = useState("");
  const customers = useMemo(
    () =>
      [...(data.customers || [])]
        .filter((customer) =>
          [customer.name, customer.phone, customer.email]
            .join(" ")
            .toLocaleLowerCase()
            .includes(deferredQuery),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 100),
    [data.customers, deferredQuery],
  );
  const selected = data.customers.find((customer) => customer.id === editing);
  const submit = (event) => {
    event.preventDefault();
    try {
      const next = saveCustomer(
        data,
        Object.fromEntries(new FormData(event.currentTarget)),
        editing,
      );
      if (save(next) !== false) {
        setEditing(null);
        event.currentTarget.reset();
        setError("");
      }
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="planning-workspace">
      <div className="planning-layout customer-layout">
        <section className="panel planning-form">
          <h2>{selected ? "Edit customer" : "Add a customer"}</h2>
          <p>Keep order preferences and allergy notes beside the customer’s history.</p>
          <form key={selected?.id || "new"} onSubmit={submit}>
            <label>Name<input name="name" defaultValue={selected?.name || ""} required /></label>
            <div className="form-row">
              <label>Phone<input name="phone" type="tel" defaultValue={selected?.phone || ""} /></label>
              <label>Email<input name="email" type="email" defaultValue={selected?.email || ""} /></label>
            </div>
            <label>Preferences<textarea name="preferences" defaultValue={selected?.preferences || ""} placeholder="Favorite flavors, decoration style, pickup preferences" /></label>
            <label>Allergies / dietary notes<textarea name="allergies" defaultValue={selected?.allergies || ""} placeholder="Record customer-provided information; verify every order" /></label>
            <label>Owner notes<textarea name="notes" defaultValue={selected?.notes || ""} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="planning-actions">
              <button className="primary">{selected ? "Save customer" : "Add customer"}</button>
              {selected && <button type="button" className="secondary" onClick={() => setEditing(null)}>Cancel</button>}
            </div>
          </form>
        </section>
        <section>
          <div className="section-top">
            <h2>Customer book <span className="pill">{data.customers.length}</span></h2>
            <input aria-label="Search customers" placeholder="Search customers" value={query} onPointerDown={(event) => event.currentTarget.focus()} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="customer-list">
            {customers.map((customer) => {
              const activity = customerActivity(data, customer);
              return (
                <article className="panel customer-card" key={customer.id}>
                  <div>
                    <h3>{customer.name}</h3>
                    <p>{[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}</p>
                  </div>
                  <dl>
                    <dt>Orders</dt><dd>{activity.orders.length}</dd>
                    <dt>Quoted / ordered</dt><dd>{money(activity.orderTotal)}</dd>
                    <dt>Last activity</dt><dd>{activity.lastDate || "—"}</dd>
                  </dl>
                  {customer.allergies && <p className="customer-alert"><b>Allergies:</b> {customer.allergies}</p>}
                  {customer.preferences && <p><b>Preferences:</b> {customer.preferences}</p>}
                  {customer.notes && <p>{customer.notes}</p>}
                  <div className="planning-actions">
                    <button className="secondary" onClick={() => setEditing(customer.id)}>Edit</button>
                    <button className="text-button" onClick={() => navigate("Quotes", { customerId: customer.id })}>Create quote</button>
                  </div>
                </article>
              );
            })}
            {!customers.length && <p className="panel empty">No matching customers. Saving a quote for a new name also creates a basic customer record.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
