import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, extname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

test("source filenames are distinct and local imports specify exact names and extensions", () => {
  const root = fileURLToPath(new URL("../src/", import.meta.url));
  const files = readdirSync(root);
  const stems = files.map(f => basename(f, extname(f)).toLowerCase());
  assert.equal(new Set(stems).size, stems.length, "Source stems must not collide on Windows or in module resolution");
  for (const file of files.filter(f => /\.(js|jsx)$/.test(f))) {
    const source = readFileSync(resolve(root, file), "utf8");
    for (const [, specifier] of source.matchAll(/(?:from\s+|import\s*)["'](\.[^"']+)["']/g)) {
      assert.ok(/\.(js|jsx|css)$/.test(specifier), `${file}: ${specifier} needs an explicit extension`);
      const target = resolve(root, specifier);
      assert.ok(readdirSync(dirname(target)).includes(basename(target)), `${file}: ${specifier} must match filename case exactly`);
    }
  }
});

test("Windows release artifacts use updater-safe hyphenated filenames", () => {
  const packageFile = fileURLToPath(new URL("../package.json", import.meta.url));
  const packageData = JSON.parse(readFileSync(packageFile, "utf8"));
  assert.equal(packageData.build.artifactName, "Bakery-Ledger-Setup-${version}.${ext}");
  assert.equal(packageData.build.artifactName.includes(" "), false);
});
