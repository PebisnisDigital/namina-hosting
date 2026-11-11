import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assetIds,
  contentSchema,
  defaultContent,
  safeLink,
  slugSchema,
} from "../src/domain/content.ts";
test("default ORIGINAL content is valid and contains no inherited private identity", () => {
  assert.equal(contentSchema.parse(defaultContent).template, "ORIGINAL");
  assert.ok(!JSON.stringify(defaultContent).includes("Vini"));
});
test("reserved slugs and malformed routes are rejected", () => {
  for (const slug of [
    "admin",
    "studio",
    "demo",
    "api",
    "UPPER",
    "a",
    "abc/def",
    "abc--",
    "-abc",
  ])
    assert.equal(slugSchema.safeParse(slug).success, false, slug);
  assert.equal(slugSchema.parse("nama-anda"), "nama-anda");
});
test("links reject execution, insecure URLs, credentials and controls", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,evil",
    "http://example.com",
    "https://user:pass@example.com",
    "https://example.com\n",
  ])
    assert.equal(safeLink(url), false, url);
  for (const url of [
    "",
    "https://wa.me/628123456789",
    "mailto:hello@example.com",
    "tel:+628123456789",
  ])
    assert.equal(safeLink(url), true, url);
});
test("card and asset schema protects renderer invariants", () => {
  const c = structuredClone(defaultContent);
  c.cards[0].visible = false;
  assert.equal(contentSchema.safeParse(c).success, false);
  c.cards[0].visible = true;
  c.cards.push({ ...c.cards[0] });
  assert.equal(contentSchema.safeParse(c).success, false);
  assert.deepEqual(assetIds(defaultContent), []);
});
