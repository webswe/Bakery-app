import React, { useMemo, useState } from "react";
import { AlertTriangle, Download, Trash2 } from "lucide-react";
import {
  cleanupCount,
  cleanupGroups,
  clearSelectedData,
} from "./dataCleanup.js";

export default function DataCleanupWorkspace({ data, save, navigate }) {
  const [selected, setSelected] = useState([]);
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const selectedGroups = useMemo(
    () => cleanupGroups.filter((group) => selected.includes(group.id)),
    [selected],
  );
  const records = selectedGroups.reduce(
    (sum, group) => sum + cleanupCount(data, group),
    0,
  );
  const toggle = (id) => {
    setNotice("");
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };
  const clear = () => {
    if (!selected.length || confirmation !== "DELETE") return;
    const names = selectedGroups.map((group) => group.title).join(", ");
    if (!confirm(`Permanently delete ${names}? This cannot be undone.`)) return;
    if (save(clearSelectedData(data, selected))) {
      setSelected([]);
      setConfirmation("");
      setNotice("Selected workspace data was cleared.");
    }
  };
  return (
    <div className="planning-workspace data-cleanup-workspace">
      <section className="panel cleanup-hero">
        <div className="cleanup-icon">
          <AlertTriangle size={22} />
        </div>
        <div>
          <span className="eyebrow">IRREVERSIBLE ACTION</span>
          <h2>Clear selected workspace data</h2>
          <p>
            Choose only the records you no longer need. Clearing data preserves
            categories you leave unchecked.
          </p>
        </div>
      </section>
      <section className="panel cleanup-selection">
        <div className="panel-heading">
          <div>
            <h2>Choose what to clear</h2>
            <p>Record counts are shown to help you review the scope.</p>
          </div>
          <button
            className="secondary"
            onClick={() => navigate("Secure backups")}
          >
            <Download size={15} /> Create backup first
          </button>
        </div>
        <div className="cleanup-options">
          {cleanupGroups.map((group) => {
            const checked = selected.includes(group.id);
            const count = cleanupCount(data, group);
            return (
              <label
                className={
                  checked ? "cleanup-option selected" : "cleanup-option"
                }
                key={group.id}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(group.id)}
                />
                <span>
                  <b>{group.title}</b>
                  <small>{group.description}</small>
                </span>
                <em>
                  {count} record{count === 1 ? "" : "s"}
                </em>
              </label>
            );
          })}
        </div>
      </section>
      <section className="panel cleanup-confirmation">
        <div>
          <h2>Confirm deletion</h2>
          <p>
            {selected.length
              ? `${records} record${records === 1 ? "" : "s"} across ${selected.length} selected section${selected.length === 1 ? "" : "s"} will be removed.`
              : "Select one or more sections above to continue."}
          </p>
        </div>
        <label>
          Type <b>DELETE</b> to enable clearing
          <input
            value={confirmation}
            onChange={(event) =>
              setConfirmation(event.target.value.toUpperCase())
            }
            placeholder="DELETE"
            disabled={!selected.length}
          />
        </label>
        <button
          className="danger-button"
          type="button"
          disabled={!selected.length || confirmation !== "DELETE"}
          onClick={clear}
        >
          <Trash2 size={16} /> Clear selected data
        </button>
        {notice && (
          <p className="positive" role="status">
            {notice}
          </p>
        )}
      </section>
    </div>
  );
}
