import React, { useState } from "react";
import { displayDocumentNumber } from "./documentOps.js";
import { orderPaid } from "./ownerOps.js";

const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);

export default function DocumentWorkspace({ data, context = {} }) {
  const initialType = context.quoteId ? "quote" : data.orders.length ? "invoice" : "quote";
  const [type, setType] = useState(initialType);
  const records = type === "quote" ? data.quotes : data.orders;
  const initialId = context.quoteId || context.orderId || records.at(-1)?.id || "";
  const [recordId, setRecordId] = useState(initialId);
  const record = records.find((item) => item.id === recordId) || records.at(-1);
  const profile = data.businessProfile || {};
  const customer = data.customers.find((item) => item.id === record?.customerId);
  const paid = type === "quote" || !record ? 0 : orderPaid(data, record);
  const selectType = (next) => {
    const nextRecords = next === "quote" ? data.quotes : data.orders;
    setType(next);
    setRecordId(nextRecords.at(-1)?.id || "");
  };
  return (
    <div className="planning-workspace document-workspace">
      <section className="panel planning-form document-controls no-print">
        <h2>Document center</h2>
        <div className="form-row">
          <label>
            Document
            <select value={type} onChange={(event) => selectType(event.target.value)}>
              <option value="quote">Quote</option>
              <option value="invoice">Invoice</option>
              <option value="pickup">Pickup slip</option>
            </select>
          </label>
          <label>
            Record
            <select value={record?.id || ""} onChange={(event) => setRecordId(event.target.value)}>
              {records.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.customer || item.recipeName || "Customer"} · {type === "quote" ? item.date : item.pickupDate}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="primary" disabled={!record} onClick={() => window.print()}>Print / Save PDF</button>
      </section>
      {record ? (
        <article className="panel business-document">
          <header className="document-header">
            <div>
              <span className="eyebrow">{type === "pickup" ? "PICKUP SLIP" : type.toUpperCase()}</span>
              <h1>{profile.name || "My Bakery"}</h1>
              <p>{[profile.address, profile.phone, profile.email].filter(Boolean).join(" · ")}</p>
            </div>
            <div className="document-number">
              <b>{displayDocumentNumber(record, type)}</b>
              <span>{type === "quote" ? record.date : record.pickupDate}</span>
            </div>
          </header>
          <section className="document-customer">
            <span className="eyebrow">CUSTOMER</span>
            <h2>{record.customer || "Customer"}</h2>
            <p>{[customer?.phone, customer?.email].filter(Boolean).join(" · ")}</p>
            {customer?.allergies && <p><b>Customer allergy notes:</b> {customer.allergies}</p>}
          </section>
          {type === "quote" ? (
            <QuoteDocument quote={record} />
          ) : type === "invoice" ? (
            <InvoiceDocument order={record} paid={paid} payments={data.payments.filter((item) => item.orderId === record.id)} />
          ) : (
            <PickupDocument order={record} paid={paid} />
          )}
          <footer>
            <p>{profile.footer || "Thank you for supporting our bakery."}</p>
            {profile.taxId && <small>Tax / registration: {profile.taxId}</small>}
          </footer>
        </article>
      ) : (
        <p className="panel empty">Create a saved quote or order before printing this document.</p>
      )}
    </div>
  );
}

function QuoteDocument({ quote }) {
  const tax = quote.snapshot.tax || 0;
  const subtotal = quote.snapshot.subtotal ?? quote.snapshot.total - tax;
  return (
    <>
      <DocumentLines rows={[
        [quote.snapshot.recipeName, `${quote.snapshot.portions} portions`, subtotal],
      ]} />
      <DocumentTotals rows={[
        ["Before tax", subtotal],
        [`Customer sales tax (${quote.snapshot.taxRate || 0}%)`, tax],
        ["Quote total", quote.snapshot.total],
      ]} />
      {quote.notes && <p className="document-notes"><b>Notes:</b> {quote.notes}</p>}
    </>
  );
}

function InvoiceDocument({ order, paid, payments }) {
  return (
    <>
      <DocumentLines rows={[[order.recipeName, `${order.portions} portions`, order.taxSnapshot?.net ?? order.total]]} />
      <DocumentTotals rows={[
        ["Before tax", order.taxSnapshot?.net ?? order.total],
        [`Customer sales tax (${order.taxSnapshot?.taxRate || 0}%)`, order.taxSnapshot?.tax || 0],
        ["Invoice total", order.total],
        ["Payments received", -paid],
        ["Balance due", order.total - paid],
      ]} />
      {!!payments.length && <div className="document-payments"><h3>Payment history</h3>{payments.map((payment) => <p key={payment.id}>{payment.date} · {payment.method} · {payment.kind === "refund" ? "Refund " : ""}{money(payment.amount)}</p>)}</div>}
    </>
  );
}

function PickupDocument({ order, paid }) {
  const recipe = order.recipeSnapshot?.recipe;
  return (
    <section className="pickup-details">
      <div><span>Pickup date</span><b>{order.pickupDate}</b></div>
      <div><span>Order</span><b>{order.recipeName} · {order.portions} portions</b></div>
      <div><span>Payment</span><b>{money(paid)} received · {money(order.total - paid)} due</b></div>
      <div><span>Allergens</span><b>{recipe?.allergens || "Not specified"}</b></div>
      <div><span>Storage</span><b>{recipe?.storageInstructions || "Not specified"}</b></div>
      {order.notes && <div><span>Order notes</span><b>{order.notes}</b></div>}
      <p className="pickup-check">☐ Identity checked &nbsp; ☐ Balance collected &nbsp; ☐ Storage explained &nbsp; ☐ Order handed off</p>
    </section>
  );
}

function DocumentLines({ rows }) {
  return <table className="document-lines"><thead><tr><th>DESCRIPTION</th><th>DETAIL</th><th>AMOUNT</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{money(row[2])}</td></tr>)}</tbody></table>;
}
function DocumentTotals({ rows }) {
  return <dl className="document-totals">{rows.map(([label, value]) => <React.Fragment key={label}><dt>{label}</dt><dd>{value < 0 ? "−" : ""}{money(Math.abs(value || 0))}</dd></React.Fragment>)}</dl>;
}

export function BusinessProfileWorkspace({ data, save }) {
  const [notice, setNotice] = useState("");
  const profile = data.businessProfile || {};
  return (
    <section className="panel planning-form business-profile">
      <h2>Business profile for printed documents</h2>
      <p>These details appear on quotes, invoices and pickup slips.</p>
      <form onSubmit={(event) => {
        event.preventDefault();
        const businessProfile = Object.fromEntries(new FormData(event.currentTarget));
        if (save({ ...data, businessProfile }) !== false) setNotice("Business profile saved.");
      }}>
        <label>Bakery name<input name="name" defaultValue={profile.name || ""} required /></label>
        <label>Address<textarea name="address" defaultValue={profile.address || ""} /></label>
        <div className="form-row"><label>Phone<input name="phone" defaultValue={profile.phone || ""} /></label><label>Email<input name="email" type="email" defaultValue={profile.email || ""} /></label></div>
        <label>Tax / registration number<input name="taxId" defaultValue={profile.taxId || ""} /></label>
        <label>Document footer<textarea name="footer" defaultValue={profile.footer || ""} placeholder="Payment terms, pickup policy, or thank-you message" /></label>
        <button className="primary">Save business profile</button>
        {notice && <p className="positive" role="status">{notice}</p>}
      </form>
    </section>
  );
}
