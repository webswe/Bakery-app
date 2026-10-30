import React, { useState } from "react";
import { Check, Palette, RotateCcw } from "lucide-react";

const palettes = [
  { id: "evergreen", label: "Evergreen", color: "#315e56" },
  { id: "berry", label: "Berry", color: "#9b4d5b" },
  { id: "sunrise", label: "Sunrise", color: "#b66a32" },
  { id: "ocean", label: "Ocean", color: "#2e6f8a" },
];

const defaults = { accent: "#315e56", density: "comfortable", showTips: true };

export default function AppCustomizationWorkspace({ data, save }) {
  const current = { ...defaults, ...(data.settings?.appearance || {}) };
  const [appearance, setAppearance] = useState(current);
  const [notice, setNotice] = useState("");
  const choose = (changes) => setAppearance((value) => ({ ...value, ...changes }));
  const saveAppearance = () => {
    const settings = { ...data.settings, appearance };
    if (save({ ...data, settings }) !== false) setNotice("App customization saved.");
  };
  const reset = () => {
    setAppearance(defaults);
    setNotice("");
  };
  return (
    <div className="planning-workspace customization-workspace">
      <section className="panel customization-card">
        <div className="customization-heading">
          <div className="customization-icon"><Palette size={25} /></div>
          <div><h2>Make Bakery Ledger feel like your workspace</h2><p>Choose an accent and working density. Your choices stay on this device and never change your recipes, records or backups.</p></div>
        </div>
        <fieldset>
          <legend>Accent color</legend>
          <div className="palette-options">
            {palettes.map((palette) => <button type="button" key={palette.id} className={appearance.accent === palette.color ? "palette-option selected" : "palette-option"} onClick={() => choose({ accent: palette.color })}>
              <i style={{ background: palette.color }} />{palette.label}{appearance.accent === palette.color && <Check size={15} />}
            </button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend>Workspace density</legend>
          <div className="choice-options">
            <button type="button" className={appearance.density === "comfortable" ? "selected" : ""} onClick={() => choose({ density: "comfortable" })}><b>Comfortable</b><small>More breathing room while planning and costing.</small></button>
            <button type="button" className={appearance.density === "compact" ? "selected" : ""} onClick={() => choose({ density: "compact" })}><b>Compact</b><small>Fits more rows on screen for busy kitchen days.</small></button>
          </div>
        </fieldset>
        <label className="toggle-option"><input type="checkbox" checked={appearance.showTips} onChange={(event) => choose({ showTips: event.target.checked })} /><span><b>Show workflow guidance</b><small>Keep the helpful next-step banner and sidebar workflow reminder visible.</small></span></label>
        <div className="planning-actions">
          <button className="primary" onClick={saveAppearance}>Save customization</button>
          <button className="secondary" onClick={reset}><RotateCcw size={15} />Reset choices</button>
          {notice && <p className="positive" role="status">{notice}</p>}
        </div>
      </section>
      <section className="panel customization-preview" style={{ "--preview-accent": appearance.accent }}>
        <span className="eyebrow">PREVIEW</span><h2>{data.businessProfile?.name || "My bakery"}</h2>
        <div><span>Today’s production</span><b>3 batches planned</b><button type="button">Open planner</button></div>
      </section>
    </div>
  );
}
