import React, { useMemo, useState } from "react";
import { ArrowUpRight, Calculator, CircleDollarSign, Save } from "lucide-react";
import {
  applyPricingRecommendation,
  pricingDeskDefaults,
  pricingDeskReport,
  savePricingPolicy,
} from "./pricingPlanner.js";
import { localDay, money } from "./uiFormatters.js";
import "./PricingPlannerStyles.css";

const percent = (value) =>
  `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(Number(value) || 0)}%`;
const quantity = (value) =>
  value == null
    ? "Not reachable"
    : new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 1,
      }).format(value);

export default function PricingDeskWorkspace({ data, save, navigate }) {
  const [recipeId, setRecipeId] = useState(data.recipes[0]?.id || "");
  const [month, setMonth] = useState(localDay().slice(0, 7));
  const [form, setForm] = useState(() => pricingDeskDefaults(data, recipeId));
  const [status, setStatus] = useState("");
  const change = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setStatus("");
  };
  const result = useMemo(() => {
    try {
      return {
        report: pricingDeskReport(data, recipeId, form, month),
        error: "",
      };
    } catch (error) {
      return { report: null, error: error.message };
    }
  }, [data, recipeId, form, month]);
  const report = result.report;

  if (!data.recipes.length)
    return (
      <section className="panel empty pricing-empty">
        <CircleDollarSign size={34} />
        <h2>Create a recipe before planning prices</h2>
        <p>
          Pricing needs a batch yield plus ingredients, packaging, labor, and
          overhead.
        </p>
        <button className="primary" onClick={() => navigate("Recipes")}>
          Create a recipe
        </button>
      </section>
    );

  return (
    <div className="pricing-desk">
      <section className="panel pricing-desk-hero">
        <div>
          <span className="eyebrow">OWNER PRICING DESK</span>
          <h2>Price the work, protect the margin, plan the month</h2>
          <p>
            Test a price safely before changing a recipe. Customer sales tax is
            shown separately and never counted as revenue or profit.
          </p>
        </div>
        <Calculator size={38} aria-hidden="true" />
      </section>

      <div className="pricing-desk-layout">
        <section className="panel planning-form pricing-assumptions">
          <div className="panel-heading">
            <div>
              <h2>Scenario assumptions</h2>
              <p>Changes here are what-if values until you save or apply.</p>
            </div>
          </div>
          <label>
            Recipe
            <select
              value={recipeId}
              onChange={(event) => {
                setRecipeId(event.target.value);
                setForm(pricingDeskDefaults(data, event.target.value));
                setStatus("");
              }}
            >
              {data.recipes.map((recipe) => (
                <option value={recipe.id} key={recipe.id}>
                  {recipe.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Target profit margin (%)
              <input
                type="number"
                min="0"
                max="90"
                step="1"
                value={form.targetMargin}
                onChange={(event) => change("targetMargin", event.target.value)}
              />
            </label>
            <label>
              Minimum margin alert (%)
              <input
                type="number"
                min="0"
                max="90"
                step="1"
                value={form.minimumMargin}
                onChange={(event) =>
                  change("minimumMargin", event.target.value)
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Waste / contingency (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.wastePercent}
                onChange={(event) => change("wastePercent", event.target.value)}
              />
            </label>
            <label>
              Planned discount (%)
              <input
                type="number"
                min="0"
                max="90"
                step="0.1"
                value={form.discountPercent}
                onChange={(event) =>
                  change("discountPercent", event.target.value)
                }
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Processing fee (%)
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={form.processorFeePercent}
                onChange={(event) =>
                  change("processorFeePercent", event.target.value)
                }
              />
            </label>
            <label>
              Fixed fee per sale ($)
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.processorFixedFee}
                onChange={(event) =>
                  change("processorFixedFee", event.target.value)
                }
              />
            </label>
          </div>
          <label>
            Selling units in a typical order
            <input
              type="number"
              min="1"
              max="1000"
              step="1"
              value={form.unitsPerOrder}
              onChange={(event) => change("unitsPerOrder", event.target.value)}
            />
          </label>
          <p className="hint">
            Enter how many boxes, dozens, or other selling units a customer
            normally buys in one payment. The fixed card fee is charged once
            for that order.
          </p>
          <div className="form-row">
            <label>
              Round selling price to ($)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.roundTo}
                onChange={(event) => change("roundTo", event.target.value)}
              />
            </label>
            <label>
              Customer sales tax preview (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.salesTaxRate}
                onChange={(event) => change("salesTaxRate", event.target.value)}
              />
            </label>
          </div>
          <button
            className="secondary"
            disabled={!report}
            onClick={() => {
              if (save(savePricingPolicy(data, form)))
                setStatus("Default pricing assumptions saved.");
            }}
          >
            <Save size={16} />
            Save as defaults
          </button>
        </section>

        <section className="panel pricing-live" aria-live="polite">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">LIVE PRICE</span>
              <h2>{report?.recipe.name || "Pricing result"}</h2>
            </div>
            {report && (
              <span
                className={
                  report.plan.belowMinimum
                    ? "margin-health danger"
                    : "margin-health"
                }
              >
                {percent(report.plan.margin)} current margin
              </span>
            )}
          </div>
          {result.error && (
            <p className="error" role="alert">
              {result.error}
            </p>
          )}
          {report && (
            <>
              <div className="pricing-primary-result">
                <span>Recommended before-tax price</span>
                <strong>{money(report.plan.suggestedSale)}</strong>
                <b>per {report.plan.label}</b>
              </div>
              <dl className="snapshot-ledger">
                <dt>Break-even price per selling unit</dt>
                <dd>{money(report.breakEvenPrice)}</dd>
                <dt>Profit per unit after discount and fees</dt>
                <dd>{money(report.plan.suggestedProfit)}</dd>
                <dt>Achieved margin after rounding</dt>
                <dd>{percent(report.plan.suggestedMargin)}</dd>
                <dt>Markup on cost</dt>
                <dd>
                  {Number.isFinite(report.plan.suggestedMarkup)
                    ? percent(report.plan.suggestedMarkup)
                    : "—"}
                </dd>
                <dt>Current saved price</dt>
                <dd>{money(report.plan.salePrice)}</dd>
              </dl>
              {!!report.plan.unallocatedPortions && (
                <p className="insight-note warning">
                  The batch leaves {report.plan.unallocatedPortions} portion
                  {report.plan.unallocatedPortions === 1 ? "" : "s"} outside a
                  full {report.plan.label}. The recommendation prices only whole
                  selling units.
                </p>
              )}
              <details className="conversion-box" open>
                <summary>Example order · {report.order.units} selling unit(s)</summary>
                <dl className="snapshot-ledger">
                  <dt>Before discount</dt>
                  <dd>{money(report.order.listSubtotal)}</dd>
                  <dt>After discount, before tax</dt>
                  <dd>{money(report.order.net)}</dd>
                  <dt>Customer sales tax</dt>
                  <dd>{money(report.order.tax)}</dd>
                  <dt>Customer pays</dt>
                  <dd>{money(report.order.total)}</dd>
                  <dt>Estimated processing fee</dt>
                  <dd>{money(report.order.processingFee)}</dd>
                  <dt>Estimated order profit</dt>
                  <dd>{money(report.order.profit)}</dd>
                </dl>
              </details>
              <button
                className="primary"
                onClick={() => {
                  if (save(applyPricingRecommendation(data, recipeId, form)))
                    setStatus(
                      `${report.recipe.name} now uses the recommended before-tax price.`,
                    );
                }}
              >
                Apply {money(report.plan.suggestedSale)} to recipe
              </button>
              {status && (
                <p className="positive" role="status">
                  {status}
                </p>
              )}
            </>
          )}
        </section>
      </div>

      {report && (
        <>
          <div className="pricing-cost-grid">
            {[
              ["Ingredients", report.plan.ingredients],
              ["Packaging", report.plan.packaging],
              ["Owner labor", report.plan.labor],
              ["Electricity", report.plan.electricity],
              ["Batch overhead", report.plan.overhead],
              [
                `Contingency (${report.plan.wastePercent}%)`,
                report.plan.bufferedBatchCost - report.plan.total,
              ],
            ].map(([label, value]) => (
              <section className="panel pricing-cost-card" key={label}>
                <span>{label}</span>
                <b>{money(value)}</b>
              </section>
            ))}
          </div>

          <section className="panel planning-form">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">PRICE LADDER</span>
                <h2>See what each margin target requires</h2>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>TARGET MARGIN</th>
                    <th>LIST PRICE</th>
                    <th>REALIZED AFTER DISCOUNT</th>
                    <th>PROCESSING FEE</th>
                    <th>PROFIT</th>
                  </tr>
                </thead>
                <tbody>
                  {report.ladder.map((row) => (
                    <tr key={row.targetMargin}>
                      <td>{percent(row.targetMargin)}</td>
                      <td>
                        <b>{money(row.listPrice)}</b>
                      </td>
                      <td>{money(row.realizedRevenue)}</td>
                      <td>{money(row.processingFee)}</td>
                      <td>{money(row.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel planning-form">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">MONTHLY SALES PLAN</span>
                <h2>Translate the price into an owner target</h2>
                <p>
                  This model assumes the selected recipe carries the plan. Mixes
                  of products should be reviewed recipe by recipe.
                </p>
              </div>
              <input
                aria-label="Planning month"
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
              />
            </div>
            <div className="pricing-goal-inputs">
              <label>
                Monthly fixed costs ($)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.monthlyFixedCosts}
                  onChange={(event) =>
                    change("monthlyFixedCosts", event.target.value)
                  }
                />
              </label>
              <label>
                Revenue goal ($)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.monthlyRevenueGoal}
                  onChange={(event) =>
                    change("monthlyRevenueGoal", event.target.value)
                  }
                />
              </label>
              <label>
                Profit goal ($)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.monthlyProfitGoal}
                  onChange={(event) =>
                    change("monthlyProfitGoal", event.target.value)
                  }
                />
              </label>
              <label>
                Selling days
                <input
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  value={form.workingDays}
                  onChange={(event) =>
                    change("workingDays", event.target.value)
                  }
                />
              </label>
            </div>
            <div className="finance-metric-grid pricing-goal-results">
              <div className="finance-metric">
                <span>Break-even units</span>
                <b>{quantity(report.monthly.breakEvenUnits)}</b>
                <small>
                  {quantity(report.monthly.breakEvenPerDay)} per selling day
                </small>
              </div>
              <div className="finance-metric">
                <span>Units for revenue goal</span>
                <b>{quantity(report.monthly.revenueGoalUnits)}</b>
                <small>
                  {quantity(report.monthly.remainingRevenueUnits)} still needed
                  after recorded revenue
                </small>
              </div>
              <div className="finance-metric">
                <span>Units for profit goal</span>
                <b>{quantity(report.monthly.profitGoalUnits)}</b>
                <small>
                  {quantity(report.monthly.remainingProfitUnits)} still needed
                  after recorded profit
                </small>
              </div>
            </div>
          </section>

          <details className="panel pricing-guide-copy">
            <summary>How Bakery Ledger recommends a price</summary>
            <div>
              <p>
                <b>Margin is not markup.</b> Margin is profit divided by selling
                revenue. Markup is profit divided by cost.
              </p>
              <p>
                The recommendation covers ingredients, packaging, labor,
                electricity, batch overhead, contingency, expected discount, and
                processing fees. It rounds the complete selling unit—not each
                portion—so boxes and dozens are not inflated by repeated
                rounding.
              </p>
              <p>
                Customer sales tax is added after the before-tax price. It is
                money collected for tax reporting, not bakery revenue.
              </p>
              <button
                className="secondary"
                onClick={() => navigate("Recipe lab")}
              >
                Open Recipe lab
                <ArrowUpRight size={15} />
              </button>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
