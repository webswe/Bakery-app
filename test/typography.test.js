import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const typography = readFileSync(
  new URL("../src/TypographySystem.css", import.meta.url),
  "utf8",
);
const entry = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

test("loads the typography system after the stability layer", () => {
  const stabilityImport = entry.indexOf('import "./StabilityPolish.css";');
  const typographyImport = entry.indexOf('import "./TypographySystem.css";');

  assert.ok(stabilityImport >= 0);
  assert.ok(typographyImport > stabilityImport);
});

test("defines readable UI, display, and numeric typography", () => {
  assert.match(typography, /--font-ui:[^;]*"Segoe UI"/s);
  assert.match(typography, /--font-display:[^;]*Georgia, serif/s);
  assert.match(typography, /body\s*{[^}]*line-height: 1\.55/s);
  assert.match(typography, /font-variant-numeric: tabular-nums lining-nums/);
});

test("keeps controls readable on desktop and mobile", () => {
  assert.match(
    typography,
    /input,[\s\S]*?select,[\s\S]*?textarea[\s\S]*?font-size: var\(--type-control\)/,
  );
  assert.match(
    typography,
    /@media \(max-width: 580px\)[\s\S]*?font-size: 16px/,
  );
});

test("limits app typography overrides to screens", () => {
  assert.match(typography, /@media screen\s*{/);
  assert.doesNotMatch(typography, /@media print/);
});
