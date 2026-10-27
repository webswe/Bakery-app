import { test } from "node:test";
import assert from "node:assert/strict";
import { createLock, verifyPin } from "../src/security.js";

test("local PIN configuration stores only a salted hash", async () => {
  const config = await createLock("4826", 12);
  assert.equal(config.minutes, 12);
  assert.ok(config.salt);
  assert.ok(config.hash);
  assert.equal(JSON.stringify(config).includes("4826"), false);
  assert.equal(await verifyPin("4826", config), true);
  assert.equal(await verifyPin("1111", config), false);
});

test("PINs must contain four to eight digits", async () => {
  await assert.rejects(() => createLock("12ab"), /4 to 8 digits/);
});
