import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuantity } from "../src/quantity.js";

test("recipe quantities accept decimals, simple fractions, mixed numbers and unicode", () => {
  assert.equal(parseQuantity("0.5"), 0.5);
  assert.equal(parseQuantity("1/2"), 0.5);
  assert.equal(parseQuantity("1 1/2"), 1.5);
  assert.equal(parseQuantity("2½"), 2.5);
  assert.equal(parseQuantity("⅔"), 2 / 3);
});

test("recipe quantities reject zero, invalid text and zero denominators", () => {
  assert.throws(() => parseQuantity("0"), /number or fraction|greater/);
  assert.throws(() => parseQuantity("one cup"), /number or fraction/);
  assert.throws(() => parseQuantity("1/0"), /denominator/);
});
