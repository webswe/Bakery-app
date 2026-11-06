import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");

test("stock form compact width applies only to its direct inputs, not lot-detail date fields", () => {
  // A descendant `.stock-form input { width: 85px }` rule truncated lot-detail dates (e.g. "01/01/20...").
  assert.doesNotMatch(css, /\.stock-form input\s*\{\s*width:\s*85px/);
  assert.match(css, /\.stock-form > input\s*\{\s*width:\s*85px/);
});

test("lot details occupy a full row and size columns from available space", () => {
  const rule = css.match(/\.stock-lot-fields\s*\{([^}]*)\}/)[1];
  assert.match(rule, /flex:\s*1 1 100%/);
  assert.match(rule, /auto-fit,\s*minmax\(min\(100%,\s*170px\),\s*1fr\)/);
  assert.match(css, /\.stock-lot-fields input\s*\{[^}]*width:\s*100%/);
});

test("shared layout conventions: spacing scale, adaptive form rows, reachable modal footer", () => {
  assert.match(css, /--space-4:\s*16px/);
  // Form rows size columns from available space; a flex-basis here turns into a height when stacked.
  assert.match(
    css,
    /\.form-row\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*180px\),\s*1fr\)\)/,
  );
  assert.doesNotMatch(css, /\.form-row > label\s*\{\s*flex:1 1 180px/);
  // Stock form keeps a hard minimum so the table column cannot collapse the lot date inputs.
  assert.match(css, /\.stock-form\s*\{\s*min-width:\s*250px;\s*\}/);
  assert.match(css, /\.modal-actions\s*\{[^}]*position:\s*sticky/);
});

test("the later dashboard-actions rule removes the negative-margin overlap with the month picker", () => {
  assert.match(
    css,
    /\.dashboard-actions\s*\{\s*margin:\s*0 0 var\(--space-4\);\s*position:\s*static/,
  );
});
