import React from "react";
import { storageKey } from "./backupStorage.js";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      failed: true,
      message: error?.message || "An unexpected error stopped this screen.",
    };
  }

  componentDidCatch(error, details) {
    console.error("Bakery Ledger could not render", error, details);
  }

  exportWorkspace = () => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;
    const blob = new Blob([saved], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bakery-Ledger-recovery-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="recovery-screen">
        <section className="panel recovery-card" role="alert">
          <span className="eyebrow">WORKSPACE RECOVERY</span>
          <h1>Bakery Ledger needs a fresh start</h1>
          <p>
            Your saved bakery data is still on this computer. Download a
            recovery copy, then reload the app.
          </p>
          <p className="error">{this.state.message}</p>
          <div className="recovery-actions">
            <button
              className="primary"
              onClick={() => window.location.reload()}
            >
              Reload Bakery Ledger
            </button>
            <button className="secondary" onClick={this.exportWorkspace}>
              Download recovery backup
            </button>
          </div>
        </section>
      </main>
    );
  }
}
