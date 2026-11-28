import React, { useState } from "react";
import { ChefHat } from "lucide-react";
import { verifyPin } from "./security.js";

export default function LockScreen({ config, onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  return (
    <main className="lock-screen">
      <section className="panel lock-card">
        <span className="brand-icon">
          <ChefHat />
        </span>
        <span className="eyebrow">OWNER WORKSPACE</span>
        <h1>Bakery Ledger is locked</h1>
        <p>Enter your local PIN to continue.</p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              if (await verifyPin(pin, config)) {
                setError("");
                onUnlock();
              } else setError("Incorrect PIN.");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          <label>
            PIN
            <input
              autoFocus
              aria-label="Owner PIN"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{4,8}"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              required
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary">Unlock workspace</button>
        </form>
      </section>
    </main>
  );
}
