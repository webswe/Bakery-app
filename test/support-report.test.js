import { test } from "node:test";
import assert from "node:assert/strict";
import { supportEmailBody, supportReportText } from "../src/supportReport.js";

test("support reports include diagnostics and reproduce steps without business data", () => {
  const report = supportReportText({ createdAt: "Nov 6", appVersion: "1.4.1", platform: "Windows 11", page: "Daily planner", action: "Edit a plan", actual: "Nothing changed", expected: "Editor opens", steps: "Click Edit", redoResult: "Same result" });
  assert.match(report, /App version: 1.4.1/);
  assert.match(report, /Steps to reproduce:\nClick Edit/);
  assert.doesNotMatch(report, /customer|recipe data|inventory/i);
  assert.match(supportEmailBody(report), /I found a problem/);
});
