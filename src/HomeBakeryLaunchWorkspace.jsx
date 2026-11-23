import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  ClipboardCopy,
  Download,
  Rocket,
  Save,
} from "lucide-react";
import {
  launchMenuGuide,
  launchReadiness,
  normalizeLaunchProfile,
  policyText,
  saveLaunchProfile,
  startupBudget,
  toggleLaunchStep,
  weeklyLaunchPlan,
} from "./homeBakeryLaunch.js";
import { money } from "./uiFormatters.js";
import "./HomeBakeryLaunchStyles.css";

const downloadText = (name, text) => {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
};

export default function HomeBakeryLaunchWorkspace({ data, save, navigate }) {
  const [tab, setTab] = useState("roadmap");
  const [notice, setNotice] = useState("");
  const readiness = useMemo(() => launchReadiness(data), [data]);
  const profile = readiness.profile;
  const budget = useMemo(() => startupBudget(data.settings), [data.settings]);
  const menu = useMemo(() => launchMenuGuide(data), [data]);
  const weekly = useMemo(() => weeklyLaunchPlan(data), [data]);
  const bakeryName =
    data.businessProfile?.name ||
    data.businessProfile?.bakeryName ||
    data.settings?.bakeryName ||
    "My home bakery";
  const policies = policyText(data.settings, bakeryName);
  const act = (operation, message) => {
    try {
      if (save(operation()) !== false) setNotice(message);
    } catch (error) {
      setNotice(error.message);
    }
  };
  return (
    <div className="home-launch">
      <section className="panel home-launch-hero">
        <div className="home-launch-icon">
          <Rocket size={28} />
        </div>
        <div>
          <span className="eyebrow">HOME BAKERY LAUNCH</span>
          <h2>Turn a baking skill into a manageable business</h2>
          <p>
            Build a compliant local plan, understand startup cash, choose a
            focused menu, set realistic capacity, and give customers clear
            policies.
          </p>
        </div>
        <div className="launch-progress">
          <b>{readiness.percent}%</b>
          <span>
            {readiness.complete} of {readiness.total} launch steps
          </span>
          <progress value={readiness.complete} max={readiness.total} />
        </div>
      </section>
      <div className="home-launch-caution">
        Requirements vary by country, state, province, county, and city. Bakery
        Ledger helps organize your research; it does not provide legal, tax, or
        food-safety advice.
      </div>
      <nav className="home-launch-tabs" aria-label="Home bakery launch tools">
        {[
          ["roadmap", "Roadmap"],
          ["budget", "Budget & income"],
          ["menu", "Menu & capacity"],
          ["policies", "Channels & policies"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? "active" : ""}
            aria-current={tab === value ? "page" : undefined}
            onClick={() => {
              setTab(value);
              setNotice("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {notice && (
        <p
          className={/saved|copied|downloaded/i.test(notice) ? "positive" : "error"}
          role="status"
        >
          {notice}
        </p>
      )}
      {tab === "roadmap" ? (
        <Roadmap
          data={data}
          profile={profile}
          readiness={readiness}
          act={act}
          navigate={navigate}
        />
      ) : tab === "budget" ? (
        <Budget data={data} profile={profile} budget={budget} weekly={weekly} act={act} />
      ) : tab === "menu" ? (
        <Menu
          data={data}
          profile={profile}
          menu={menu}
          weekly={weekly}
          act={act}
          navigate={navigate}
        />
      ) : (
        <Policies
          data={data}
          profile={profile}
          text={policies}
          act={act}
          setNotice={setNotice}
        />
      )}
    </div>
  );
}

function Roadmap({ data, profile, readiness, act, navigate }) {
  return (
    <div className="home-launch-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Launch roadmap</h2>
            <p>
              Automatic checks update from the app. Mark research and real-world
              tasks complete when you have actually handled them.
            </p>
          </div>
        </div>
        <div className="launch-step-list">
          {readiness.steps.map((step) => (
            <button
              key={step.id}
              className={step.complete ? "launch-step complete" : "launch-step"}
              onClick={() =>
                act(
                  () => toggleLaunchStep(data, step.id),
                  "Launch roadmap saved.",
                )
              }
            >
              {step.complete ? (
                <CheckCircle2 size={21} />
              ) : (
                <Circle size={21} />
              )}
              <span>
                <b>{step.title}</b>
                <small>{step.detail}</small>
                {step.automatic && <em>Confirmed from saved app data</em>}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel planning-form">
        <h2>Your launch stage</h2>
        <form
          key={`${profile.stage}-${profile.targetLaunchDate}`}
          onSubmit={(event) => {
            event.preventDefault();
            const form = Object.fromEntries(new FormData(event.currentTarget));
            act(
              () =>
                saveLaunchProfile(data, {
                  stage: form.stage,
                  targetLaunchDate: form.targetLaunchDate,
                  localRequirements: form.localRequirements,
                }),
              "Launch plan saved.",
            );
          }}
        >
          <label>
            Current stage
            <select name="stage" defaultValue={profile.stage}>
              <option value="idea">Exploring the idea</option>
              <option value="setup">Setting up the business</option>
              <option value="soft-launch">Testing with a soft launch</option>
              <option value="operating">Taking regular paid orders</option>
            </select>
          </label>
          <label>
            Target launch date
            <input
              name="targetLaunchDate"
              type="date"
              defaultValue={profile.targetLaunchDate}
            />
          </label>
          <label>
            Local requirements and research notes
            <textarea
              name="localRequirements"
              rows="9"
              defaultValue={profile.localRequirements}
              placeholder="Permit office, cottage-food rules, approved products, required label wording, allergen disclosure, insurance, zoning, pickup restrictions…"
            />
          </label>
          <button className="primary">
            <Save size={16} />
            Save launch details
          </button>
        </form>
        <div className="planning-actions">
          <button className="text-button" onClick={() => navigate("Setup checklist")}>
            Open owner setup checklist
          </button>
          <button className="text-button" onClick={() => navigate("Business profile")}>
            Edit business identity
          </button>
        </div>
      </section>
    </div>
  );
}

function Budget({ data, profile, budget, weekly, act }) {
  const startupLabels = {
    permits: "Permits, courses & inspections",
    insurance: "Insurance deposit",
    equipment: "Equipment & smallwares",
    packaging: "Opening packaging stock",
    branding: "Branding, photos & signs",
    marketFees: "Market or event deposits",
    other: "Other startup costs",
  };
  const monthlyLabels = {
    insurance: "Insurance",
    utilities: "Additional utilities",
    software: "Software & subscriptions",
    marketing: "Marketing",
    marketFees: "Markets & sales fees",
    other: "Other recurring costs",
  };
  return (
    <>
      <div className="home-launch-metrics">
        <article className="panel">
          <span>Startup total</span>
          <b>{money(budget.startupTotal)}</b>
        </article>
        <article className="panel">
          <span>Cash still needed</span>
          <b>{money(budget.remainingStartup)}</b>
        </article>
        <article className="panel">
          <span>Monthly fixed costs</span>
          <b>{money(budget.monthlyTotal)}</b>
        </article>
        <article className="panel">
          <span>Three-month runway</span>
          <b>{money(budget.threeMonthRunway)}</b>
        </article>
      </div>
      <div className="home-launch-layout">
        <section className="panel planning-form">
          <h2>Startup and monthly budget</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = Object.fromEntries(new FormData(event.currentTarget));
              act(
                () =>
                  saveLaunchProfile(data, {
                    startupCash: form.startupCash,
                    monthlyOwnerIncome: form.monthlyOwnerIncome,
                    startupCosts: Object.fromEntries(
                      Object.keys(startupLabels).map((key) => [
                        key,
                        form[`startup-${key}`],
                      ]),
                    ),
                    monthlyCosts: Object.fromEntries(
                      Object.keys(monthlyLabels).map((key) => [
                        key,
                        form[`monthly-${key}`],
                      ]),
                    ),
                  }),
                "Launch budget saved.",
              );
            }}
          >
            <div className="form-row">
              <label>
                Cash available to start
                <input
                  name="startupCash"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={profile.startupCash}
                />
              </label>
              <label>
                Desired monthly owner income
                <input
                  name="monthlyOwnerIncome"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={profile.monthlyOwnerIncome}
                />
              </label>
            </div>
            <h3>One-time startup costs</h3>
            <div className="launch-cost-grid">
              {Object.entries(startupLabels).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={`startup-${key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={profile.startupCosts[key]}
                  />
                </label>
              ))}
            </div>
            <h3>Recurring monthly costs</h3>
            <div className="launch-cost-grid">
              {Object.entries(monthlyLabels).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    name={`monthly-${key}`}
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={profile.monthlyCosts[key]}
                  />
                </label>
              ))}
            </div>
            <button className="primary">
              <Save size={16} />
              Save budget
            </button>
          </form>
        </section>
        <section className="panel">
          <h2>What the business must earn</h2>
          <dl className="snapshot-ledger">
            <dt>Owner income target</dt>
            <dd>{money(profile.monthlyOwnerIncome)} / month</dd>
            <dt>Recurring business costs</dt>
            <dd>{money(budget.monthlyTotal)} / month</dd>
            <dt>Total monthly contribution needed</dt>
            <dd><b>{money(weekly.monthlyNeed)}</b></dd>
            <dt>Weekly contribution needed</dt>
            <dd><b>{money(weekly.weeklyNeed)}</b></dd>
          </dl>
          {weekly.averageProfit > 0 ? (
            <p className="hint">
              Based on the average contribution of launch-ready recipes. Review
              the Menu & capacity tab before treating this as a sales target.
            </p>
          ) : (
            <p className="error">
              Add and price at least one profitable recipe to calculate a weekly
              unit target.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Menu({ data, profile, menu, weekly, act, navigate }) {
  return (
    <>
      <div className="home-launch-metrics">
        <article className="panel">
          <span>Launch-ready recipes</span>
          <b>{weekly.menu.length}</b>
        </article>
        <article className="panel">
          <span>Average profit / selling unit</span>
          <b>{money(weekly.averageProfit)}</b>
        </article>
        <article className="panel">
          <span>Units needed / week</span>
          <b>{weekly.unitsPerWeek ?? "—"}</b>
        </article>
        <article className="panel">
          <span>Suggested units / working day</span>
          <b>{weekly.dailyUnits ?? "—"}</b>
        </article>
      </div>
      <div className="home-launch-layout">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Minimum viable menu</h2>
              <p>
                Start with a few repeatable, profitable products instead of
                offering every recipe at once.
              </p>
            </div>
            <button className="text-button" onClick={() => navigate("Pricing desk")}>
              Open pricing desk
            </button>
          </div>
          <div className="launch-menu-list">
            {menu.map((row, index) => (
              <article className="launch-menu-row" key={row.recipeId}>
                <span className="launch-rank">{index + 1}</span>
                <span>
                  <b>{row.name}</b>
                  <small>
                    {money(row.price)} price · {money(row.cost)} cost ·{" "}
                    {money(row.profit)} contribution
                  </small>
                  <small>{row.margin.toFixed(1)}% margin</small>
                  {!!row.readiness.length && (
                    <em>{row.readiness.join(" · ")}</em>
                  )}
                </span>
                <strong>
                  {index < 5 && !row.readiness.length ? "Launch candidate" : "Review"}
                </strong>
              </article>
            ))}
            {!menu.length && (
              <p className="empty-note">Create a recipe to start the menu guide.</p>
            )}
          </div>
        </section>
        <section className="panel planning-form">
          <h2>Owner capacity</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = Object.fromEntries(new FormData(event.currentTarget));
              act(
                () =>
                  saveLaunchProfile(data, {
                    workingDaysPerWeek: form.workingDaysPerWeek,
                    hoursPerWeek: form.hoursPerWeek,
                    maxBatchesPerWeek: form.maxBatchesPerWeek,
                  }),
                "Launch capacity saved.",
              );
            }}
          >
            <label>
              Baking / selling days per week
              <input
                name="workingDaysPerWeek"
                type="number"
                min="1"
                max="7"
                step="1"
                defaultValue={profile.workingDaysPerWeek}
              />
            </label>
            <label>
              Hours available per week
              <input
                name="hoursPerWeek"
                type="number"
                min="0"
                step="0.5"
                defaultValue={profile.hoursPerWeek}
              />
            </label>
            <label>
              Maximum batches per week
              <input
                name="maxBatchesPerWeek"
                type="number"
                min="1"
                step="1"
                defaultValue={profile.maxBatchesPerWeek}
              />
            </label>
            <button className="primary">Save capacity</button>
          </form>
          <dl className="snapshot-ledger">
            <dt>Estimated batches needed</dt>
            <dd>{weekly.requiredBatches ?? "Set prices and goals"}</dd>
            <dt>Estimated menu capacity</dt>
            <dd>{weekly.capacityUnits} selling units / week</dd>
            <dt>Capacity shortfall</dt>
            <dd className={weekly.capacityGap > 0 ? "negative" : ""}>
              {weekly.capacityGap ?? "—"} selling units
            </dd>
          </dl>
          {weekly.capacityGap > 0 && (
            <p className="error">
              The income target is above this batch limit. Raise contribution,
              simplify the menu, add capacity, or lower the initial income goal.
            </p>
          )}
        </section>
      </div>
    </>
  );
}

function Policies({ data, profile, text, act, setNotice }) {
  const channelLabels = {
    customOrders: "Custom preorder",
    porchPickup: "Scheduled pickup",
    markets: "Farmers markets / pop-ups",
    wholesale: "Wholesale",
    delivery: "Local delivery",
    online: "Online ordering",
  };
  return (
    <div className="home-launch-layout">
      <section className="panel planning-form">
        <h2>Sales channels and customer policies</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            act(
              () =>
                saveLaunchProfile(data, {
                  channels: Object.fromEntries(
                    Object.keys(channelLabels).map((key) => [
                      key,
                      form.has(`channel-${key}`),
                    ]),
                  ),
                  policies: {
                    depositPercent: form.get("depositPercent"),
                    leadDays: form.get("leadDays"),
                    cancellationHours: form.get("cancellationHours"),
                    pickupWindow: form.get("pickupWindow"),
                    latePolicy: form.get("latePolicy"),
                    customOrderNote: form.get("customOrderNote"),
                  },
                }),
              "Sales channels and policies saved.",
            );
          }}
        >
          <fieldset>
            <legend>Where you plan to sell</legend>
            <div className="launch-channel-grid">
              {Object.entries(channelLabels).map(([key, label]) => (
                <label className="check-row" key={key}>
                  <input
                    name={`channel-${key}`}
                    type="checkbox"
                    defaultChecked={profile.channels[key]}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-row">
            <label>
              Deposit required (%)
              <input
                name="depositPercent"
                type="number"
                min="0"
                max="100"
                step="1"
                defaultValue={profile.policies.depositPercent}
              />
            </label>
            <label>
              Minimum order lead time (days)
              <input
                name="leadDays"
                type="number"
                min="0"
                step="1"
                defaultValue={profile.policies.leadDays}
              />
            </label>
            <label>
              Cancellation notice (hours)
              <input
                name="cancellationHours"
                type="number"
                min="0"
                step="1"
                defaultValue={profile.policies.cancellationHours}
              />
            </label>
          </div>
          <label>
            Pickup wording
            <textarea
              name="pickupWindow"
              defaultValue={profile.policies.pickupWindow}
            />
          </label>
          <label>
            Late-pickup wording
            <textarea
              name="latePolicy"
              defaultValue={profile.policies.latePolicy}
            />
          </label>
          <label>
            Additional custom-order note
            <textarea
              name="customOrderNote"
              defaultValue={profile.policies.customOrderNote}
              placeholder="Design changes, color matching, serving estimates, allergens, or transport…"
            />
          </label>
          <button className="primary">
            <Save size={16} />
            Save channels and policies
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Plain-language policy draft</h2>
        <pre className="launch-policy-preview">{text}</pre>
        <div className="planning-actions">
          <button
            className="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(text);
                setNotice("Policy draft copied.");
              } catch {
                setNotice("Copy was blocked. Download the policy instead.");
              }
            }}
          >
            <ClipboardCopy size={16} />
            Copy draft
          </button>
          <button
            className="secondary"
            onClick={() => {
              downloadText("home-bakery-order-policy.txt", text);
              setNotice("Policy draft downloaded.");
            }}
          >
            <Download size={16} />
            Download
          </button>
        </div>
        <p className="hint">
          Review and adapt this draft for local laws and your actual business
          practices before sharing it with customers.
        </p>
      </section>
    </div>
  );
}
