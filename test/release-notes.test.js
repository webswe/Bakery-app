import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { plainReleaseNote, releaseNotes } = require("../release-notes.cjs");

test("release notes become readable native-dialog text", () => {
  assert.equal(
    plainReleaseNote(
      "<h2>Changes</h2><ul><li>Faster search</li><li>Better labels &amp; prep</li></ul>",
    ),
    "Changes\n• Faster search\n• Better labels & prep",
  );
  assert.equal(
    releaseNotes({
      releaseNotes: [{ note: "<p>First</p>" }, { note: "<text>Second</text>" }],
    }),
    "First\n\nSecond",
  );
  assert.equal(
    plainReleaseNote(
      "&amp;lt;text&amp;gt;## Changes&amp;lt;/text&amp;gt;\n- [Recipe history](https://example.test)\n- **Better labels**",
    ),
    "Changes\n• Recipe history\n• Better labels",
  );
  assert.equal(
    releaseNotes({
      releaseNotes: [{ text: { content: "<text>Nested note</text>" } }],
    }),
    "Nested note",
  );
});
