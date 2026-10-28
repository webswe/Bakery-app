import React, { useDeferredValue, useMemo, useState } from "react";
import { finishedProductAlerts } from "./productLots.js";
import { localDate } from "./planning.js";

const money = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
const qty = (value) => Number((value || 0).toFixed(3));

export default function TraceabilityWorkspace({ data }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query).toLocaleLowerCase();
  const alerts = useMemo(
    () => finishedProductAlerts(data, localDate()),
    [data],
  );
  const batches = useMemo(
    () =>
      [...(data.productionBatches || [])]
        .filter((batch) =>
          [batch.batchCode, batch.recipeName, batch.producedAt]
            .join(" ")
            .toLocaleLowerCase()
            .includes(deferredQuery),
        )
        .reverse()
        .slice(0, 60),
    [data.productionBatches, deferredQuery],
  );
  return (
    <div className="planning-workspace trace-workspace">
      <div className="planning-toolbar">
        <div>
          <h2>Batch and lot traceability</h2>
          <p>Follow each finished batch back to the ingredient delivery lots consumed during production.</p>
        </div>
        <label>Find a batch<input value={query} onPointerDown={(event) => event.currentTarget.focus()} onChange={(event) => setQuery(event.target.value)} placeholder="Batch, recipe or date" /></label>
      </div>
      <div className="stats planning-stats">
        <div className="stat"><div>Production batches</div><strong>{data.productionBatches.length}</strong></div>
        <div className="stat"><div>Active finished lots</div><strong>{data.productLots.filter((lot) => lot.remaining > 0).length}</strong></div>
        <div className="stat"><div>Expired finished lots</div><strong>{alerts.filter((lot) => lot.expired).length}</strong></div>
        <div className="stat"><div>Upcoming best-before</div><strong>{alerts.filter((lot) => !lot.expired).length}</strong></div>
      </div>
      <div className="trace-list">
        {batches.map((batch) => {
          const productLot = data.productLots.find((lot) => lot.id === batch.productLotId);
          return (
            <article className="panel trace-card" key={batch.id}>
              <header>
                <div><span className="pill">{batch.batchCode}</span><h2>{batch.recipeName}</h2><p>{batch.producedAt} · {batch.batches} batch(es) · {batch.quantity} portions</p></div>
                <div><b>{money(batch.cost)}</b><small>captured cost</small></div>
              </header>
              <div className="trace-product-lot">
                <span>Finished lot</span>
                <b>{productLot ? `${qty(productLot.remaining)} of ${qty(productLot.quantity)} portions remaining` : "Legacy aggregate stock"}</b>
                <small>{productLot?.bestBefore ? `Best before ${productLot.bestBefore}` : "No best-before date"}{productLot?.storageInstructions ? ` · ${productLot.storageInstructions}` : ""}</small>
              </div>
              <h3>Ingredient lots used</h3>
              <div className="trace-ingredients">
                {(batch.ingredientLotUsage || []).map((usage) => {
                  const lot = data.inventoryLots.find((item) => item.id === usage.lotId);
                  const item = data.items.find((row) => row.id === usage.itemId || row.id === lot?.itemId);
                  return (
                    <div key={usage.lotId}>
                      <span><b>{item?.name || "Removed item"}</b><small>Lot {usage.lotId.slice(0, 8)} · received {lot?.receivedAt || "legacy"}</small></span>
                      <span>{qty(usage.amount)} {lot?.unit || item?.unit || "units"}<small>{lot?.supplier || "Supplier not recorded"}{lot?.expiryDate ? ` · expires ${lot.expiryDate}` : ""}</small></span>
                    </div>
                  );
                })}
                {!(batch.ingredientLotUsage || []).length && <p>Produced from aggregate inventory recorded before delivery-lot tracking, or from untracked legacy stock.</p>}
              </div>
            </article>
          );
        })}
        {!batches.length && <p className="panel empty">Complete a production task to create the first traceable batch.</p>}
      </div>
    </div>
  );
}
