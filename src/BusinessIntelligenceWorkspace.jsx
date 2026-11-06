import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  applyBusinessProfile,
  applyScheduleSuggestions,
  financialCenter,
  financialGuidance,
  productionPerformance,
  recordProductionActual,
  saveBusinessProfile,
  scheduleSuggestions,
  setupProgress,
  supplierInsights,
  wasteCoaching,
} from "./businessIntelligence.js";
import { receiveInventory } from "./inventoryLots.js";
import { decryptWorkspace, encryptWorkspace } from "./secureBackup.js";
import { downloadBlob, localDay, money } from "./uiFormatters.js";

const today = () => localDay();
const percent = (value) => `${(Number(value) || 0).toFixed(1)}%`;

export default function BusinessIntelligenceWorkspace({
  data,
  save,
  page,
  navigate,
  restoreData,
}) {
  if (page === "Financial center") return <FinancialCenter data={data} />;
  if (page === "Smart schedule")
    return <SmartSchedule data={data} save={save} navigate={navigate} />;
  if (page === "Production performance")
    return (
      <ProductionPerformance data={data} save={save} navigate={navigate} />
    );
  if (page === "Receiving") return <Receiving data={data} save={save} />;
  if (page === "Supplier insights") return <Suppliers data={data} />;
  if (page === "Waste coach")
    return <WasteCoach data={data} navigate={navigate} />;
  if (page === "Trace labels") return <TraceLabels data={data} />;
  if (page === "Bakery profiles")
    return <BakeryProfiles data={data} save={save} />;
  if (page === "Secure backups")
    return <SecureBackups data={data} save={save} restoreData={restoreData} />;
  if (page === "Change history") return <ChangeHistory data={data} />;
  return <SetupChecklist data={data} save={save} navigate={navigate} />;
}

function FinancialCenter({ data }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const report = useMemo(() => financialCenter(data, month), [data, month]);
  const guidance = financialGuidance(report);
  const metrics = [
    ["Revenue", money(report.revenue), report.progress.revenue],
    ["Net profit", money(report.profit), report.progress.profit],
    ["Cash recorded", money(report.cashIn), report.progress.reserve],
    ["Outstanding", money(report.outstanding), null],
    ["Profit margin", percent(report.margin), null],
    ["Waste cost", money(report.wasteCost), null],
  ];
  return (
    <div className="operations-stack">
      <div className="planning-toolbar">
        <div>
          <h2>Financial command center</h2>
          <p>
            Follow profitability, cash movement, outstanding balances, and goal
            progress without mixing tax into revenue.
          </p>
        </div>
        <input
          aria-label="Financial reporting month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </div>
      <div className="finance-metric-grid">
        {metrics.map(([label, value, progress]) => (
          <article className="panel finance-metric" key={label}>
            <span>{label}</span>
            <b>{value}</b>
            {progress != null && (
              <>
                <div className="goal-progress" aria-label={`${label} progress`}>
                  <i style={{ width: `${Math.min(100, progress)}%` }} />
                </div>
                <small>{percent(progress)} of goal</small>
              </>
            )}
          </article>
        ))}
      </div>
      <div className="operations-grid">
        <section className="panel planning-form">
          <h2>Owner guidance</h2>
          {guidance.map((note) => (
            <article className={`insight-note ${note.level}`} key={note.title}>
              <b>{note.title}</b>
              <p>{note.detail}</p>
            </article>
          ))}
        </section>
        <section className="panel planning-form">
          <h2>Profit bridge</h2>
          <dl className="snapshot-ledger">
            <dt>Sales before tax</dt>
            <dd>{money(report.revenue)}</dd>
            <dt>Production costs sold</dt>
            <dd>− {money(report.costs)}</dd>
            <dt>Operating expenses</dt>
            <dd>− {money(report.overhead)}</dd>
            <dt>Net profit</dt>
            <dd>
              <b>{money(report.profit)}</b>
            </dd>
          </dl>
          <p className="hint">
            Sales tax collected is {money(report.collectedTax)} and is shown
            separately because it is not business income.
          </p>
        </section>
      </div>
      <section className="panel planning-form">
        <h2>Operating expense mix</h2>
        {report.expenseGroups.map((row) => (
          <div className="expense-bar-row" key={row.name}>
            <span>{row.name}</span>
            <div>
              <i
                style={{
                  width: `${report.overhead ? (row.amount / report.overhead) * 100 : 0}%`,
                }}
              />
            </div>
            <b>{money(row.amount)}</b>
          </div>
        ))}
        {!report.expenseGroups.length && (
          <p className="empty-note">No operating expenses recorded.</p>
        )}
      </section>
    </div>
  );
}

function SmartSchedule({ data, save, navigate }) {
  const [start, setStart] = useState(today());
  const rows = useMemo(() => scheduleSuggestions(data, start), [data, start]);
  return (
    <div className="operations-stack">
      <section className="panel planning-form">
        <div className="panel-heading">
          <div>
            <h2>Automatic production scheduler</h2>
            <p>
              Turn unplanned accepted orders into production tasks before their
              pickup dates. Existing plans are left alone.
            </p>
          </div>
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </div>
        {rows.map((row) => (
          <div className="schedule-suggestion" key={row.id}>
            <time>{row.date}</time>
            <span>
              <b>{row.recipe.name}</b>
              <small>
                {row.batches} batch(es) for {row.customer} · pickup{" "}
                {row.pickupDate}
                {row.learned ? " · uses your actual-time history" : ""}
              </small>
            </span>
            <b>{row.minutes} min</b>
          </div>
        ))}
        {!rows.length && (
          <p className="positive">
            All accepted orders in this period are planned.
          </p>
        )}
        <div className="planning-actions">
          <button
            className="primary"
            disabled={!rows.length}
            onClick={() => save(applyScheduleSuggestions(data, rows))}
          >
            Add {rows.length} task(s) to production
          </button>
          <button
            className="secondary"
            onClick={() => navigate("Capacity planner")}
          >
            Check capacity
          </button>
        </div>
      </section>
    </div>
  );
}

function ProductionPerformance({ data, save, navigate }) {
  const report = useMemo(() => productionPerformance(data), [data]);
  return (
    <div className="operations-stack">
      <div className="stats planning-stats">
        <div className="stat">
          <div>Completed plans</div>
          <strong>{report.completed}</strong>
        </div>
        <div className="stat">
          <div>Yields measured</div>
          <strong>{report.measured}</strong>
        </div>
        <div className="stat">
          <div>Average yield variance</div>
          <strong>{percent(report.averageYieldVariance)}</strong>
        </div>
        <div className="stat">
          <div>Completed on planned day</div>
          <strong>{percent(report.onDayPercent)}</strong>
        </div>
      </div>
      <section className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>DATE</th>
              <th>RECIPE</th>
              <th>PLANNED</th>
              <th>ACTUAL</th>
              <th>VARIANCE</th>
              <th>FINISHED ON DAY</th>
              <th>ACTUAL TIME</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.slice(0, 100).map((row) => (
              <tr key={row.id}>
                <td>{row.date}</td>
                <td>
                  <b>{row.recipeName}</b>
                </td>
                <td>{row.plannedYield}</td>
                <td>{row.actualYield ?? "Not recorded"}</td>
                <td className={row.yieldVariance < -5 ? "negative" : ""}>
                  {row.yieldVariance == null ? "—" : percent(row.yieldVariance)}
                </td>
                <td>{row.onDay == null ? "—" : row.onDay ? "Yes" : "No"}</td>
                <td>
                  <form
                    className="actual-entry"
                    onSubmit={(event) => {
                      event.preventDefault();
                      try {
                        save(
                          recordProductionActual(
                            data,
                            row.id,
                            Object.fromEntries(
                              new FormData(event.currentTarget),
                            ),
                          ),
                        );
                      } catch (error) {
                        alert(error.message);
                      }
                    }}
                  >
                    <input
                      aria-label={`Actual yield for ${row.recipeName}`}
                      name="actualYield"
                      type="number"
                      min="0"
                      step="0.1"
                      defaultValue={row.actualYield ?? ""}
                      placeholder="Yield"
                    />
                    <input
                      aria-label={`Actual minutes for ${row.recipeName}`}
                      name="actualMinutes"
                      type="number"
                      min="1"
                      step="1"
                      defaultValue={row.actualMinutes ?? ""}
                      placeholder="Minutes"
                    />
                    <button className="text-button">Save</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <button className="secondary" onClick={() => navigate("Batch yields")}>
        Record missing yields
      </button>
    </div>
  );
}

function Receiving({ data, save }) {
  const [itemId, setItemId] = useState(data.items[0]?.id || "");
  const [notice, setNotice] = useState("");
  return (
    <div className="operations-grid">
      <section className="panel planning-form">
        <h2>Receive a delivery</h2>
        <p>
          Update stock, supplier history, purchase cost, and lot tracking
          together.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const form = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              save(receiveInventory(data, itemId, form));
              setNotice("Delivery received and inventory updated.");
              event.currentTarget.reset();
            } catch (error) {
              setNotice(error.message);
            }
          }}
        >
          <label>
            Item
            <select
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
            >
              {data.items.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Packages
              <input
                name="packages"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label>
              Price per package
              <input name="packagePrice" type="number" min="0" step="0.01" />
            </label>
          </div>
          <div className="form-row">
            <label>
              Supplier
              <input name="supplier" />
            </label>
            <label>
              Received
              <input
                name="receivedAt"
                type="date"
                defaultValue={today()}
                required
              />
            </label>
            <label>
              Expiry, if known
              <input name="expiryDate" type="date" />
            </label>
          </div>
          <button className="primary">Receive delivery</button>
        </form>
        {notice && (
          <p role="status" className="hint">
            {notice}
          </p>
        )}
      </section>
      <section className="panel planning-form">
        <h2>Recent deliveries</h2>
        {[...(data.purchaseHistory || [])]
          .reverse()
          .slice(0, 12)
          .map((row) => (
            <div className="legend" key={row.id}>
              <span>
                <b>{row.itemName}</b>
                <small>
                  {row.date} · {row.supplier || "No supplier"}
                </small>
              </span>
              <b>{money(row.finalPackageCost ?? row.packagePrice)}</b>
            </div>
          ))}
      </section>
    </div>
  );
}

function Suppliers({ data }) {
  const rows = useMemo(() => supplierInsights(data), [data]);
  return (
    <section className="panel table-scroll">
      <table>
        <thead>
          <tr>
            <th>ITEM</th>
            <th>BEST RECORDED SUPPLIER</th>
            <th>UNIT COST</th>
            <th>OTHER PRICES</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.itemId || row.itemName}>
              <td>
                <b>{row.itemName}</b>
              </td>
              <td>{row.best?.supplier}</td>
              <td>{money(row.best?.unitCost)}</td>
              <td>
                {row.offers
                  .slice(1)
                  .map((offer) => `${offer.supplier} ${money(offer.unitCost)}`)
                  .join(" · ") || "—"}
              </td>
              <td>
                <span className={row.reorder ? "pill danger" : "pill"}>
                  {row.reorder ? "REORDER" : "OK"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="empty-note">
          Receive purchases from suppliers to compare normalized prices.
        </p>
      )}
    </section>
  );
}

function WasteCoach({ data, navigate }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const rows = useMemo(() => wasteCoaching(data, month), [data, month]);
  return (
    <div className="operations-stack">
      <div className="planning-toolbar">
        <div>
          <h2>Waste prevention coach</h2>
          <p>Turn repeat waste patterns into a concrete next action.</p>
        </div>
        <input
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </div>
      <div className="operations-grid">
        {rows.map((row) => (
          <article className="panel planning-form" key={row.name}>
            <span className="eyebrow">
              {row.entries} ENTRY/ENTRIES · {money(row.cost)}
            </span>
            <h2>{row.name}</h2>
            <p>
              <b>Main reason:</b> {row.topReason}
            </p>
            <p>{row.action}</p>
          </article>
        ))}
      </div>
      {!rows.length && (
        <p className="panel empty">No waste recorded for this month.</p>
      )}
      <button className="secondary" onClick={() => navigate("Use soon")}>
        Open use-soon plan
      </button>
    </div>
  );
}

function TraceLabels({ data }) {
  const batches = [...(data.productionBatches || [])].reverse().slice(0, 30);
  const [selected, setSelected] = useState(batches[0]?.id || "");
  const batch = batches.find((row) => row.id === selected);
  const [qr, setQr] = useState("");
  useEffect(() => {
    if (!batch) return setQr("");
    QRCode.toDataURL(`BAKERY-LEDGER|${batch.id}|${batch.producedAt}`, {
      width: 180,
      margin: 1,
    }).then(setQr);
  }, [batch]);
  return (
    <div className="operations-stack">
      <section className="panel planning-form no-print">
        <h2>Traceable product labels</h2>
        <p>
          Print a QR label that identifies the production batch without exposing
          customer information.
        </p>
        <label>
          Batch
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {batches.map((row) => (
              <option key={row.id} value={row.id}>
                {row.producedAt} · {row.recipeName}
              </option>
            ))}
          </select>
        </label>
        <button
          className="primary"
          onClick={() => window.print()}
          disabled={!batch}
        >
          Print label
        </button>
      </section>
      {batch && (
        <section className="panel trace-qr-label">
          <div>
            <span className="eyebrow">BAKERY LEDGER · BATCH TRACE</span>
            <h2>{batch.recipeName}</h2>
            <p>Produced {batch.producedAt}</p>
            <p>Batch {batch.id.slice(0, 12).toUpperCase()}</p>
          </div>
          {qr && <img src={qr} alt={`QR code for batch ${batch.id}`} />}
        </section>
      )}
    </div>
  );
}

function BakeryProfiles({ data, save }) {
  const profiles = data.businessProfiles || [];
  return (
    <div className="operations-grid">
      <section className="panel planning-form">
        <h2>Save the current bakery profile</h2>
        <p>
          Keep separate business identity and appearance presets for brands,
          locations, or concepts. Inventory and sales stay in the same ledger.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = Object.fromEntries(new FormData(event.currentTarget));
            save(saveBusinessProfile(data, form));
            event.currentTarget.reset();
          }}
        >
          <label>
            Profile name
            <input name="name" placeholder="Main bakery" required />
          </label>
          <button className="primary">Save current profile</button>
        </form>
      </section>
      <section className="panel planning-form">
        <h2>Saved profiles</h2>
        {profiles.map((profile) => (
          <div className="legend" key={profile.id}>
            <span>
              <b>{profile.name}</b>
              <small>{profile.businessProfile?.name || "Bakery details"}</small>
            </span>
            <button
              className="secondary"
              onClick={() => save(applyBusinessProfile(data, profile.id))}
            >
              Apply
            </button>
          </div>
        ))}
        {!profiles.length && (
          <p className="empty-note">No profiles saved yet.</p>
        )}
      </section>
    </div>
  );
}

function SecureBackups({ data, save, restoreData }) {
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const exportBackup = async () => {
    try {
      const contents = await encryptWorkspace(data, password);
      downloadBlob(
        `bakery-ledger-secure-${today()}.bkl`,
        contents,
        "application/json",
      );
      setNotice(
        "Encrypted backup downloaded. Keep its password somewhere safe.",
      );
      save({
        ...data,
        settings: {
          ...data.settings,
          setup: { ...data.settings?.setup, backupReviewed: true },
          lastSecureBackupAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      setNotice(error.message);
    }
  };
  const importBackup = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      const next = await decryptWorkspace(await file.text(), password);
      if (confirm("Replace the current workspace with this encrypted backup?"))
        restoreData(next);
      setNotice("Encrypted backup opened successfully.");
    } catch (error) {
      setNotice(error.message);
    }
    event.target.value = "";
  };
  const restoreDeviceBackup = async () => {
    try {
      const result = await window.bakeryDesktop?.restoreDeviceBackup();
      if (!result) return;
      if (
        confirm("Replace the current workspace with this daily device backup?")
      ) {
        restoreData(result.workspace);
        setNotice(`Restored ${result.path}.`);
      }
    } catch (error) {
      setNotice(error.message);
    }
  };
  return (
    <div className="operations-grid">
      <section className="panel planning-form">
        <h2>Password-protected backup</h2>
        <p>
          The file is encrypted on this device with AES-256. Bakery Ledger
          cannot recover a forgotten password.
        </p>
        <label>
          Backup password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        <div className="planning-actions">
          <button className="primary" onClick={exportBackup}>
            Download encrypted backup
          </button>
          <label className="secondary file-button">
            Open encrypted backup
            <input
              type="file"
              accept=".bkl,application/json"
              onChange={importBackup}
            />
          </label>
        </div>
        {notice && (
          <p role="status" className="hint">
            {notice}
          </p>
        )}
      </section>
      <section className="panel planning-form">
        <h2>Backup routine</h2>
        <p>
          The installed Windows app keeps up to 30 daily device-encrypted files
          in Documents/Bakery Ledger Backups. Local restore points are also kept
          for 14 working days. Download a portable secure backup weekly and keep
          it away from this computer.
        </p>
        <dl>
          <dt>Last secure export</dt>
          <dd>
            {data.settings?.lastSecureBackupAt
              ? new Date(data.settings.lastSecureBackupAt).toLocaleString()
              : "Not recorded"}
          </dd>
          <dt>Suggested frequency</dt>
          <dd>Weekly, and before each app update</dd>
        </dl>
        {window.bakeryDesktop?.restoreDeviceBackup && (
          <button className="secondary" onClick={restoreDeviceBackup}>
            Restore a daily device backup
          </button>
        )}
      </section>
    </div>
  );
}

function ChangeHistory({ data }) {
  const rows = [...(data.changeLog || [])].reverse();
  return (
    <section className="panel planning-form">
      <h2>Workspace change history</h2>
      <p>
        A compact record of which parts of the ledger changed. Backups remain
        the place to restore earlier data.
      </p>
      {rows.map((row) => (
        <div className="legend" key={row.id}>
          <span>
            <b>{row.summary}</b>
            <small>{new Date(row.at).toLocaleString()}</small>
            {!!row.records?.length && (
              <small>
                {row.records
                  .slice(0, 4)
                  .map(
                    (record) =>
                      `${record.label} “${record.name}” ${record.action}`,
                  )
                  .join(" · ")}
              </small>
            )}
          </span>
          <span>{row.areas.join(", ")}</span>
        </div>
      ))}
      {!rows.length && (
        <p className="empty-note">
          Changes made after this upgrade will appear here.
        </p>
      )}
    </section>
  );
}

function SetupChecklist({ data, save, navigate }) {
  const progress = setupProgress(data);
  return (
    <div className="operations-stack">
      <section className="panel setup-progress">
        <div>
          <span className="eyebrow">OWNER SETUP</span>
          <h2>{progress.percent}% complete</h2>
          <p>
            Finish these once, then Bakery Ledger can make stronger
            recommendations.
          </p>
        </div>
        <div
          className="setup-ring"
          style={{ "--progress": `${progress.percent * 3.6}deg` }}
        >
          {progress.completed}/{progress.checks.length}
        </div>
      </section>
      <section className="panel planning-form">
        {progress.checks.map((row) => (
          <div className="setup-check" key={row.label}>
            <span className={row.complete ? "complete" : ""}>
              {row.complete ? "✓" : "○"}
            </span>
            <b>{row.label}</b>
            <button className="text-button" onClick={() => navigate(row.page)}>
              {row.complete ? "Review" : "Set up"}
            </button>
          </div>
        ))}
      </section>
      <button
        className="secondary"
        onClick={() =>
          save({
            ...data,
            settings: {
              ...data.settings,
              setup: {
                ...data.settings?.setup,
                checklistVisitedAt: new Date().toISOString(),
              },
            },
          })
        }
      >
        Mark checklist reviewed
      </button>
    </div>
  );
}
