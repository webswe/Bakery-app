import React, { useState } from "react";
import { Mail, Save, ShieldCheck } from "lucide-react";
import { supportEmailBody, supportReportText } from "./supportReport.js";
import { downloadBlob } from "./uiFormatters.js";

const localDateTime = () => new Date().toLocaleString();

export default function SupportWorkspace({ data, page }) {
  const [report, setReport] = useState("");
  const [notice, setNotice] = useState("");
  const supportEmail = data.businessProfile?.supportEmail || "";
  const createReport = async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const appInfo = window.bakeryDesktop
      ? await window.bakeryDesktop.getAppInfo()
      : { version: "Browser preview", platform: navigator.userAgent };
    const details = {
      ...form,
      createdAt: localDateTime(),
      page,
      appVersion: appInfo.version,
      platform: appInfo.platform,
    };
    const next = supportReportText(details);
    setReport(next);
    try {
      const result = await window.bakeryDesktop?.saveSupportReport(next);
      setNotice(
        result?.path
          ? `Saved safely to ${result.path}`
          : "Report created. Save it or copy it into your email.",
      );
    } catch {
      setNotice("Report created. Save it or copy it into your email.");
    }
  };
  const email = () => {
    if (!supportEmail) return;
    window.bakeryDesktop?.openSupportEmail(
      supportEmail,
      "Bakery Ledger support report",
      supportEmailBody(report),
    );
  };
  return (
    <div className="planning-workspace support-workspace">
      <section className="panel planning-form">
        <span className="eyebrow">HELP & SUPPORT</span>
        <h2>Tell us what went wrong</h2>
        <p>
          Create a report on this computer, then attach it to an email. Your
          recipes, customers, inventory, sales, and backups are never included.
        </p>
        <form onSubmit={createReport}>
          <label>
            What were you trying to do?
            <textarea
              name="action"
              required
              placeholder="For example: edit a production task for Friday"
            />
          </label>
          <label>
            What happened?
            <textarea
              name="actual"
              required
              placeholder="Describe what you saw, including any message on screen"
            />
          </label>
          <label>
            What did you expect to happen?
            <textarea
              name="expected"
              required
              placeholder="For example: I expected the editor to open with the task details"
            />
          </label>
          <label>
            Could you try it once more and list the steps?
            <textarea
              name="steps"
              required
              placeholder={
                "1. Open Daily planner\n2. Choose Friday\n3. Select Edit on the cake task"
              }
            />
          </label>
          <label>
            What happened when you tried again?{" "}
            <span className="hint">Optional, but very helpful</span>
            <textarea
              name="redoResult"
              placeholder="Did it happen every time, only once, or after a specific step?"
            />
          </label>
          <label>
            Email or name for a reply <span className="hint">Optional</span>
            <input name="contact" />
          </label>
          <button className="primary">
            <Save size={16} />
            Create support report
          </button>
        </form>
        {notice && (
          <p className="positive" role="status">
            {notice}
          </p>
        )}
      </section>
      {report && (
        <section className="panel support-report-preview">
          <div className="panel-heading">
            <div>
              <h2>Your support report</h2>
              <p>Review it before sharing.</p>
            </div>
            <ShieldCheck size={22} />
          </div>
          <pre>{report}</pre>
          <div className="planning-actions">
            <button
              className="secondary"
              onClick={() =>
                downloadBlob("Bakery-Ledger-support-report.txt", report)
              }
            >
              Save a copy
            </button>
            {supportEmail ? (
              <button className="primary" onClick={email}>
                <Mail size={16} />
                Open email draft
              </button>
            ) : (
              <p className="hint">
                Add a support email in Business profile to open an addressed
                email draft.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
