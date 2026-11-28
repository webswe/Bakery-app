import assert from "node:assert/strict";
import test from "node:test";
import { migrateData } from "../src/analytics.js";
import { createOrder, updateOrder } from "../src/business.js";
import {
  readWorkspaceDraft,
  removeOptionalStorage,
  writeOptionalStorage,
} from "../src/optionalWorkspaceStorage.js";
import { removeQuote, saveQuote } from "../src/planning.js";
import {
  applyPricingRecommendation,
  pricingDeskDefaults,
  pricingDeskReport,
} from "../src/pricingPlanner.js";
import { priceForMargin } from "../src/pricingStrategy.js";
import { rememberPage } from "../src/qol.js";

function workspace() {
  return migrateData({
    salesTaxRate: 7,
    items: [
      { id: "flour", name: "Flour", unit: "g", amount: 1000, price: 12 },
    ],
    recipes: [
      {
        id: "cookies",
        name: "Cookies",
        yield: 6,
        price: 2.5,
        saleFormat: "box",
        saleQuantity: 2,
        overheadPerBatch: 3,
        lines: [{ itemId: "flour", unit: "g", amount: 500 }],
      },
    ],
  });
}

const scenario = {
  targetMargin: 40,
  processorFeePercent: 2,
  processorFixedFee: 0.6,
  unitsPerOrder: 3,
  discountPercent: 10,
  wastePercent: 0,
  roundTo: 0.5,
  monthlyFixedCosts: 100,
};

test("pricing covers batch overhead and charges one fixed fee per typical order", () => {
  const data = workspace();
  const report = pricingDeskReport(data, "cookies", scenario, "2026-11");
  assert.equal(report.plan.suggestedSale, 6.5);
  assert.equal(report.breakEvenPrice, 4);
  assert.equal(report.variableCostPerUnit, 3);
  assert.equal(report.monthly.breakEvenUnits, 40);
  assert.equal(report.order.listSubtotal, 19.5);
  assert.equal(report.order.net, 17.55);
  assert.equal(report.order.tax, 1.23);
  assert.equal(report.order.total, 18.78);
  assert.ok(Math.abs(report.order.processingFee - 0.951) < 1e-9);

  const updated = applyPricingRecommendation(data, "cookies", scenario);
  assert.equal(updated.recipes[0].salePrice, report.plan.suggestedSale);
  assert.equal(pricingDeskDefaults(updated, "cookies").unitsPerOrder, 3);
  assert.equal(updated.settings.pricingGuide, undefined);
  assert.equal(updated.recipeVersions[0].recipe.salePrice, 5);
});

test("pricing blocks incomplete recipe costs and recipes without a full selling unit", () => {
  const data = workspace();
  data.items[0].needsPrice = true;
  assert.throws(() => pricingDeskReport(data, "cookies"), /Flour/);
  data.items[0].needsPrice = false;
  data.recipes[0].yield = 1;
  assert.throws(() => applyPricingRecommendation(data, "cookies"), /at least one box/);
});

test("rounding stays on whole cents and honors quote margins above 90 percent", () => {
  const price = priceForMargin({ cost: 5, targetMargin: 95, roundTo: 0.015 });
  assert.equal(price.listPrice, 100);
  assert.ok(price.margin >= 95);
  assert.equal(price.roundTo, 0.02);
  assert.throws(() => priceForMargin({ cost: 5, targetMargin: 70, processorFeePercent: 30 }), /less than 100%/);
});

test("accepting an existing quote twice cannot create a second order or edit the original", () => {
  const input = {
    recipeId: "cookies",
    portions: 6,
    margin: 35,
    extraCost: 0,
    taxRate: 7,
    date: "2026-11-28",
  };
  const quoted = saveQuote(workspace(), input);
  const id = quoted.quotes[0].id;
  const orderInput = { quoteId: id, deposit: 0, pickupDate: "2026-11-29" };
  const accepted = createOrder(quoted, orderInput);
  assert.equal(accepted.orders.length, 1);
  assert.equal(accepted.productionPlans.length, 1);
  assert.throws(() => createOrder(accepted, orderInput), /already has an order/);
  assert.throws(() => saveQuote(accepted, input, id), /cannot be recalculated/);
  assert.throws(() => removeQuote(accepted, id), /must be kept/);

  const cancelled = updateOrder(accepted, accepted.orders[0].id, "cancel");
  assert.equal(createOrder(cancelled, orderInput).orders.length, 2);
});

test("unavailable optional storage leaves drafts and navigation usable in memory", () => {
  const fail = () => { throw Error("Storage unavailable"); };
  const storage = { getItem: fail, setItem: fail, removeItem: fail };
  assert.equal(readWorkspaceDraft(storage, "draft"), null);
  assert.equal(writeOptionalStorage(storage, "draft", "{}"), false);
  assert.equal(removeOptionalStorage(storage, "draft"), false);
  assert.deepEqual(rememberPage(storage, ["Overview"], "Quotes"), ["Quotes", "Overview"]);
  assert.equal(readWorkspaceDraft({ getItem: () => "[]" }, "draft"), null);
});
