import test from "node:test";
import assert from "node:assert/strict";
import { blankSite } from "../src/static/sites";
import {
  buildClientImagePrompt, buildClientVideoPrompt, hasClientPromptContext,
  whatsAppLinkFromNumber, whatsAppNumberFromLink,
} from "../src/static/generatorPrompts";

test("master prompts adapt to each client's identity without inventing details", () => {
  const site = blankSite("nadinaputri");
  assert.equal(hasClientPromptContext(site), false);
  site.content.identity.displayName = "Nadira Putri";
  site.content.identity.profession = "Digital Creator";
  site.content.identity.bio = "Membuat konten edukasi UMKM";
  assert.equal(hasClientPromptContext(site), true);
  const image = buildClientImagePrompt(site);
  const video = buildClientVideoPrompt(site);
  for (const prompt of [image, video]) {
    assert.match(prompt, /CLIENT NAME: Nadira Putri/);
    assert.match(prompt, /CLIENT PROFESSION: Digital Creator/);
    assert.match(prompt, /PROFILE CONTEXT: Membuat konten edukasi UMKM/);
    assert.match(prompt, /CENTER/);
  }
  assert.match(image, /IMAGE 1.*PRIMARY REFERENCE/);
  assert.match(image, /original outfit/);
  assert.match(video, /START MOVING IMMEDIATELY/);
  assert.match(video, /MOVING FLOOR - ESSENTIAL/);
  assert.match(video, /FLOOR.*MOVE/);
  assert.match(video, /SEAMLESS LOOP/);
  site.content.identity.profession = "Perawat";
  assert.match(buildClientImagePrompt(site), /CLIENT PROFESSION: Perawat/);
  assert.doesNotMatch(buildClientVideoPrompt(site), /CLIENT PROFESSION: Digital Creator/);
});

test("WhatsApp editor shows local number and keeps existing preset chat message", () => {
  assert.equal(whatsAppNumberFromLink("https://wa.me/6281234567890?text=Halo%20kak"), "081234567890");
  assert.equal(whatsAppLinkFromNumber("0812 3456-7890", "https://wa.me/628999?text=Halo%20kak"),
    "https://wa.me/6281234567890?text=Halo%20kak");
  assert.equal(whatsAppLinkFromNumber("81234567890"), "https://wa.me/6281234567890");
  assert.equal(whatsAppLinkFromNumber(""), "");
});
