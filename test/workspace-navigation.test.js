import { test } from "node:test";
import assert from "node:assert/strict";
import {
  sections,
  pages,
  readRoute,
  routeHash,
  sectionFor,
} from "../src/workspaceNavigation.js";
test("all workspace routes are reachable once, and handoffs stay inside the app", () => {
  const routes = sections.flatMap((s) => s.pages);
  assert.equal(new Set(routes).size, routes.length);
  assert.deepEqual([...routes].sort(), Object.keys(pages).sort());
  for (const page of routes) {
    assert.equal(sectionFor(page).pages.includes(page), true);
    assert.equal(readRoute(routeHash(page)).page, page);
    if (pages[page].next) assert.ok(Object.hasOwn(pages, pages[page].next));
  }
});
test("quote handoffs round trip safely and invalid addresses recover to Overview", () => {
  const context = { quoteId: "order&special?#=1" };
  assert.deepEqual(readRoute(routeHash("Orders", context)), {
    page: "Orders",
    context,
  });
  for (const hash of [
    "",
    "#page=missing",
    "#page=__proto__",
    "#page=constructor",
    "#page=%",
  ])
    assert.equal(readRoute(hash).page, "Overview");
});
