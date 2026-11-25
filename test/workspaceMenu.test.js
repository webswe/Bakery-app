import assert from "node:assert/strict";
import test from "node:test";
import { sections, workspaceMenu } from "../src/workspaceNavigation.js";

test("workspace menus list every section page exactly once", () => {
  for (const section of sections) {
    const { primary, grouped } = workspaceMenu(section);
    const destinations = [...primary, ...grouped.flatMap(([, names]) => names)];

    assert.ok(primary.length > 0, section.name);
    assert.deepEqual(
      destinations.sort(),
      [...section.pages].sort(),
      section.name,
    );
  }
});
