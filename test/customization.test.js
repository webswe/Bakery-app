import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAppearance } from "../src/appearanceThemes.js";
import { dashboardWidgets, normalizeDashboardConfig } from "../src/dashboardConfig.js";

test("appearance settings retain legacy accent choices and recover unknown themes", () => {
  assert.equal(resolveAppearance({ accent: "#2f718a" }).themeId, "ocean");
  assert.equal(resolveAppearance({ themeId: "missing" }).themeId, "evergreen");
  assert.equal(resolveAppearance({ themeId: "rose", density: "compact" }).density, "compact");
});

test("dashboard settings preserve valid order while adding new widgets safely", () => {
  const config = normalizeDashboardConfig({ order: ["salesMix", "missing", "trend"], hidden: ["profitLoss", "missing"], showToday: false });
  assert.deepEqual(config.order.slice(0, 2), ["salesMix", "trend"]);
  assert.deepEqual(new Set(config.order), new Set(dashboardWidgets.map((widget) => widget.id)));
  assert.deepEqual(config.hidden, ["profitLoss"]);
  assert.equal(config.showToday, false);
  assert.equal(config.showSummary, true);
});
