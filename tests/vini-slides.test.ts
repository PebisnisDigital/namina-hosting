import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { contentSchema } from "../src/domain/content.ts";
import { buildViniSlides } from "../src/domain/viniSlides.ts";

const published = JSON.parse(readFileSync(new URL("../public/clients/vini.json", import.meta.url), "utf8"));
const cards = contentSchema.parse(published.content).cards;

test("every visible published Vini card appears in exactly one rotating slide", () => {
  const slides = buildViniSlides(cards, 2);
  const actual = slides.flatMap((slide) => slide.items.map((item) => item.id));
  const expected = cards.filter((card) => card.visible).map((card) => card.id);
  assert.equal(actual.length, expected.length);
  assert.equal(new Set(actual).size, actual.length);
  assert.deepEqual(new Set(actual), new Set(expected));
  assert.ok(slides.every((slide) => slide.items.length >= 1 && slide.items.length <= 2));
});

test("mobile slides show one identity item and preserve Studio visibility", () => {
  const mobile = buildViniSlides(cards, 1);
  assert.ok(mobile.every((slide) => slide.items.length === 1));
  assert.ok(mobile.every((slide) => slide.items[0].visible));
  assert.equal(mobile.length, cards.filter((card) => card.visible).length);
});

test("slide sections remain distinct, including contact channels", () => {
  const slides = buildViniSlides(cards, 2);
  const sections = slides.map((slide) => slide.section);
  assert.ok(sections.includes("profil"));
  assert.ok(sections.includes("keahlian"));
  assert.ok(sections.includes("karya"));
  assert.ok(sections.includes("kontak"));
  const contacts = cards.filter((card) => card.visible && card.type === "contact");
  assert.equal(slides.filter((slide) => slide.section === "kontak").flatMap((slide) => slide.items).length, contacts.length);
});
