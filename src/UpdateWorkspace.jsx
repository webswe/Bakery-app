import React, { useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";

const desktop = () => window.bakeryDesktop;
const checkedAt = (value) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not checked yet";

function useUpdateState() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    const bridge = desktop();
    if (!bridge) return undefined;
    bridge.getUpdateState().then(setStatus);
    return bridge.onUpdateStatus(setStatus);
  }, []);
  return status;
}

export function UpdateStatusBadge() {
  const status = useUpdateState();
  if (!status || ["idle", "current", "development"].includes(status.state)) return null;
  return (
    <span className={`update-badge ${status.state}`} title={status.message}>
      {status.state === "downloaded" ? "Update ready" : status.state === "error" ? "Update issue" : status.message}
    </span>
  );
}

export default function UpdateWorkspace() {
  const status = useUpdateState();
  const bridge = desktop();
  const busy = status && ["checking", "downloading"].includes(status.state);
  return (
    <div className="planning-workspace update-workspace">
      <section className="panel update-card">
        <div className="update-icon"><Download size={28} /></div>
        <div>
          <span className="eyebrow">WINDOWS DESKTOP APP</span>
          <h2>Bakery Ledger {status?.currentVersion || ""}</h2>
          <p>{status?.message || "This browser preview cannot install desktop updates."}</p>
          {status && <p className="update-last-checked">Last checked: {checkedAt(status.checkedAt)}</p>}
          {status?.state === "downloading" && <div className="update-progress"><i style={{ width: `${status.progress || 5}%` }} /></div>}
          {status?.error && <p className="error" role="alert">{status.error}</p>}
          <div className="planning-actions">
            <button className="primary" disabled={!bridge || busy} onClick={() => bridge.checkForUpdates()}>
              <RefreshCw size={16} className={busy ? "spin" : ""} />
              {busy ? "Checking…" : "Check for updates"}
            </button>
            {status?.state === "downloaded" && <button className="secondary" onClick={() => bridge.installUpdate()}>Restart and install</button>}
          </div>
        </div>
      </section>
      {status?.notes && <section className="panel release-notes"><h2>What’s new in {status.availableVersion}</h2><div>{status.notes}</div></section>}
      <section className="panel planning-form">
        <h2>How updates work</h2>
        <p>The installed Windows app checks the public Bakery Ledger release feed when it opens. Updates download in the background, then wait for you to restart. Recipes, inventory, orders and backups remain in the app’s local Windows data folder.</p>
      </section>
    </div>
  );
}
