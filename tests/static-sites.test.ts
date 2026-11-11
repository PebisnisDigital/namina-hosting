import { test } from "node:test";
import assert from "node:assert/strict";
import { blankSite, normalizeSite, prepareSite, resolveMedia, siteDocumentSchema, viniSeed } from "../src/static/sites.ts";
import { originalStyleDefaults } from "../src/static/originalStyle.ts";

test("demo ORIGINAL is /vini and preserves the existing card collection", () => {
  const site = normalizeSite(viniSeed);
  assert.equal(site.slug, "vini");
  assert.equal(site.content.template, "ORIGINAL");
  assert.equal(site.content.cards.length, 18);
  assert.equal(site.content.identity.displayName, "TEH VINI");
  assert.equal(resolveMedia(site)[site.content.background.desktopVideoAssetId!], "/videos/hero.mp4");
});

test("new clients have independent editable content and no inherited video", () => {
  const client = blankSite("klien-baru");
  assert.equal(siteDocumentSchema.safeParse(prepareSite(client)).success, true);
  assert.equal(client.content.cards.length, 1);
  assert.equal(client.media.desktopVideo, "");
  assert.equal(client.content.original?.nama.items.length, 1);
  assert.equal(client.content.original?.karir.items.length, 0);
  assert.equal(client.content.original?.karya.items.length, 0);
  assert.equal(client.content.original?.produk.items.length, 0);
  assert.equal(client.content.original?.contactUrl, "");
  client.content.identity.displayName = "Profil baru";
  assert.equal(viniSeed.content.identity.displayName, "TEH VINI");
});

test("client menu titles can be renamed without breaking older website documents", () => {
  const site = blankSite("menu-custom");
  site.content.original!.karir.title = "Pengalaman Profesional";
  site.content.original!.produk.title = "Layanan Saya";
  const saved = normalizeSite(site);
  assert.equal(saved.content.original!.karir.title, "Pengalaman Profesional");
  assert.equal(saved.content.original!.produk.title, "Layanan Saya");

  delete site.content.original!.karir.title;
  assert.equal(siteDocumentSchema.safeParse(site).success, true);
  site.content.original!.produk.title = "";
  assert.equal(siteDocumentSchema.safeParse(site).success, false);
});

test("mobile video framing can be edited without changing desktop framing", () => {
  const site = blankSite("bingkai-video");
  site.content.background.focalX = 31;
  site.content.background.mobileFocalX = 45;
  const published = normalizeSite(site);
  assert.equal(published.content.background.focalX, 31);
  assert.equal(published.content.background.mobileFocalX, 45);
  assert.equal(siteDocumentSchema.safeParse(published).success, true);
  site.content.background.mobileFocalX = 101;
  assert.equal(siteDocumentSchema.safeParse(site).success, false);
});

test("Original gallery images and specific HTTPS links are preserved for publication", () => {
  const site = blankSite("galeri-klien");
  const id = crypto.randomUUID();
  site.content.original!.karya.items.push({
    id, title: "Website Klien", description: "Detail dari karya ini.", link: "https://contoh.com/portofolio",
    imageAssetId: null, color: "#ee4851", motif: "cinema",
  });
  site.media.cards[id] = "/media/galeri-klien/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp";
  const normalized = normalizeSite(site);
  assert.equal(normalized.content.original!.karya.items[0].imageAssetId, id);
  assert.equal(normalized.content.original!.karya.items[0].link, "https://contoh.com/portofolio");
  assert.equal(resolveMedia(normalized)[id], site.media.cards[id]);
  site.content.original!.karya.items[0].link = "javascript:alert(1)";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
  site.content.original!.karya.items[0].link = "mailto:hi@example.com";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
});

test("media validation allows HTTPS Dropbox URLs but blocks scripts and insecure URLs", () => {
  const site = blankSite("klien-tes");
  site.media.desktopVideo = "https://www.dropbox.com/scl/fi/contoh/video.mp4?raw=1";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, true);
  site.media.desktopVideo = "http://example.com/hero.mp4";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
  site.media.desktopVideo = "javascript:alert(1)";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
});

test("publishing requires a valid visible card and safe links", () => {
  const site = blankSite("valid-klien");
  site.content.cards[0].visible = false;
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
  site.content.cards[0].visible = true;
  site.content.cards[0].link = "javascript:alert(1)";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(site)).success, false);
});

test("visual Studio settings, custom button graphics and per-card labels survive publication", () => {
  const client = blankSite("pemilik-karya");
  client.content.identity.brandLabel = "KARYA.ID";
  client.content.identity.introLabel = "Selamat datang";
  client.content.theme.titleColor = "#ffffff";
  client.content.theme.roleColor = "#e6b65a";
  client.content.theme.headingScale = 1.2;
  client.content.theme.cardTitleScale = 1.15;
  client.content.theme.cardValueScale = 1.1;
  client.content.theme.cardBodyScale = 0.9;
  client.media.enterKey = "/media/pemilik-karya/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.webp";
  client.content.cards[0].link = "https://wa.me/6281212345678";
  client.content.cards[0].linkLabel = "Chat saya";
  const published = normalizeSite(client);
  assert.equal(published.content.theme.enterKeyAssetId !== null, true);
  assert.equal(resolveMedia(published)[published.content.theme.enterKeyAssetId!], client.media.enterKey);
  assert.equal(published.content.cards[0].linkLabel, "Chat saya");
  assert.equal(published.content.identity.brandLabel, "KARYA.ID");
  client.media.enterKey = "/media/pemilik-karya/../../error.webp";
  assert.equal(siteDocumentSchema.safeParse(prepareSite(client)).success, false);
});

test("Original design controls persist per client without changing the shared master", () => {
  const client = blankSite("warna-klien");
  const custom = {
    ...originalStyleDefaults,
    backgroundColor: "#151923",
    accentColor: "#e6b65a",
    fontFamily: "georgia" as const,
    titleScale: 1.15,
    factColumns: 4,
    galleryColumns: 3,
    cardGap: 20,
    buttonVariant: "outline" as const,
    shadow: "strong" as const,
    borderWidth: 2,
  };
  client.content.original!.style = custom;
  assert.equal(siteDocumentSchema.safeParse(prepareSite(client)).success, true);
  const published = normalizeSite(client);
  assert.deepEqual(published.content.original!.style, custom);
  assert.equal(blankSite("warna-lain").content.original?.style, undefined);
  assert.equal(viniSeed.content.original?.style, undefined);

  // All styling input goes through a bounded schema before publishing.
  client.content.original!.style = { ...custom, factColumns: 10 };
  assert.equal(siteDocumentSchema.safeParse(prepareSite(client)).success, false);
  client.content.original!.style = { ...custom, titleScale: 3 };
  assert.equal(siteDocumentSchema.safeParse(prepareSite(client)).success, false);
  client.content.original!.style = { ...custom, borderColor: "#12345g" };
  assert.equal(siteDocumentSchema.safeParse(prepareSite(client)).success, false);
});

