import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { blankSite, prepareSite } from "../../src/static/sites.ts";

const testDir = mkdtempSync(join(tmpdir(), "namina-generator-ci-"));
const dataDir = join(testDir, "private");
const siteDir = join(testDir, "public_html");
cpSync(join(process.cwd(), "hosting-dist"), siteDir, { recursive: true });
const port = 4186;
const base = `http://127.0.0.1:${port}`;
const env = { ...process.env, NAMINA_PRIVATE_DIR: dataDir };

const init = execFileSync("php", [join(siteDir, "api/setup-generator.php")], { env, encoding: "utf8" });
const admin = init.match(/ADMIN TOKEN[^\n]*\n([a-f0-9]{64})/i)?.[1];
assert.ok(admin, "setup must output a one-time admin token");

const server = spawn("php", ["-S", `127.0.0.1:${port}`, "-t", siteDir], { env, stdio: "ignore" });

async function query(token: string, action: string, body?: object): Promise<{ status: number; body: any; response: Response }> {
  const response = await fetch(`${base}/api/generator.php?action=${action}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const parsed = response.headers.get("content-type")?.startsWith("application/json") ? await response.json() : null;
  return { status: response.status, body: parsed, response };
}

async function ready() {
  for (let i = 0; i < 60; i++) {
    try { await fetch(`${base}/api/generator.php`); return; }
    catch { await delay(100); }
  }
  throw new Error("PHP test server did not start");
}

async function run() {
  await ready();
  let result = await query("0".repeat(64), "session");
  assert.equal(result.status, 403, "random tokens are rejected");
  result = await query(admin!, "session");
  assert.equal(result.body.role, "admin");

  const site = prepareSite(blankSite("klien-uji"));
  site.content.identity.displayName = "Klien Uji";
  site.content.original!.nama.items[0].value = "Klien Uji";
  site.media.desktopVideo = "https://www.dropbox.com/scl/fi/video/example.mp4?raw=1";

  result = await query(admin!, "create", { slug: site.slug, policy: "approval", document: site, brief: "Nama: Klien Uji" });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  const clientToken = result.body.token;
  assert.match(clientToken, /^[a-f0-9]{64}$/);

  const privateData = readFileSync(join(dataDir, "sites/klien-uji.json"), "utf8");
  assert.equal(privateData.includes(clientToken), false, "raw client token must not be saved");
  assert.deepEqual(JSON.parse(privateData).document.media.cards, {}, "private JSON must keep media.cards as an object");
  assert.equal(Array.isArray(JSON.parse(privateData).document.media.cards), false);
  const clientSession = await query(clientToken, "session");
  assert.deepEqual(clientSession.body, { role: "client", slug: "klien-uji" });

  result = await query(clientToken, "site&slug=klien-lain");
  assert.equal(result.status, 403, "clients cannot access each other");

  result = await query(clientToken, "site&slug=klien-uji");
  assert.equal(result.status, 200);
  assert.equal(result.body.site.revision, 1);
  assert.equal(result.body.site.accessHash, undefined);
  assert.equal(result.body.site.brief, undefined, "private brief should stay admin-only");
  assert.deepEqual(result.body.site.document.media.cards, {}, "empty media mapping must remain a JSON object in API responses");
  assert.equal(Array.isArray(result.body.site.document.media.cards), false);

  result = await query(clientToken, "save", { slug: site.slug, document: site, expectedRevision: 0 });
  assert.equal(result.status, 409, "revision conflicts are rejected");

  const altered = structuredClone(site);
  altered.content.identity.profession = "Wirausaha";
  altered.media.cards[altered.content.cards[0].id] = "https://example.com/gambar.webp";
  result = await query(clientToken, "save", { slug: site.slug, document: altered, expectedRevision: 1 });
  assert.equal(result.status, 200);
  assert.equal(result.body.revision, 2);

  result = await query(clientToken, "publish", { slug: site.slug, expectedRevision: 2 });
  assert.equal(result.body.status, "pending", "approval clients cannot publish immediately");
  result = await query(admin!, "site&slug=klien-uji");
  assert.equal(result.body.site.pendingRevision, 2);
  assert.equal(result.body.site.document.media.cards[altered.content.cards[0].id], "https://example.com/gambar.webp");

  result = await query(admin!, "review", { slug: site.slug, decision: "reject", expectedRevision: 2 });
  assert.equal(result.body.status, "rejected");
  result = await query(admin!, "site&slug=klien-uji");
  assert.equal(result.body.site.publishedRevision, 0);

  result = await query(clientToken, "publish", { slug: site.slug, expectedRevision: 2 });
  assert.equal(result.body.status, "pending");
  result = await query(admin!, "review", { slug: site.slug, decision: "approve", expectedRevision: 2 });
  assert.equal(result.body.status, "published");
  assert.ok(statSync(join(siteDir, "klien-uji/index.html")).size > 200);
  assert.equal(statSync(join(siteDir, "klien-uji")).mode & 0o777, 0o755, "published client directory must be web-readable");
  assert.equal(statSync(join(siteDir, "klien-uji/index.html")).mode & 0o777, 0o644, "published client page must not be 0600/403");
  const published = JSON.parse(readFileSync(join(siteDir, "clients/klien-uji.json"), "utf8"));
  assert.equal(published.content.identity.profession, "Wirausaha");
  assert.equal(Array.isArray(published.media.cards), false, "public JSON must use an object for media mapping");
  assert.equal(published.media.cards[altered.content.cards[0].id], "https://example.com/gambar.webp");
  assert.match(readFileSync(join(siteDir, "klien-uji/index.html"), "utf8"), /content="klien-uji"/);

  result = await query(admin!, "policy", { slug: site.slug, policy: "self" });
  assert.equal(result.status, 200);
  result = await query(clientToken, "publish", { slug: site.slug, expectedRevision: 2 });
  assert.equal(result.body.status, "published", "self-publish must work");

  const bad = structuredClone(altered);
  bad.media.desktopVideo = "javascript:alert(1)";
  result = await query(clientToken, "save", { slug: site.slug, document: bad, expectedRevision: 2 });
  assert.equal(result.status, 422, "unsafe media URLs must be rejected by PHP too");

  const unsafeCard = structuredClone(altered);
  unsafeCard.content.cards[0].link = "javascript:alert(1)";
  result = await query(clientToken, "save", { slug: site.slug, document: unsafeCard, expectedRevision: 2 });
  assert.equal(result.status, 422, "unsafe card links must be rejected by PHP too");

  const zipResponse = await fetch(`${base}/api/generator.php?action=download`, {
    method: "POST", headers: { Authorization: `Bearer ${clientToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ slug: site.slug }),
  });
  assert.equal(zipResponse.status, 200, "ZIP export must work");
  const blob = new Uint8Array(await zipResponse.arrayBuffer());
  assert.equal(String.fromCharCode(...blob.slice(0, 2)), "PK", "download must be a real ZIP archive");

  result = await query(admin!, "rotate", { slug: site.slug });
  const replacement = result.body.token;
  assert.notEqual(replacement, clientToken);
  assert.equal((await query(clientToken, "session")).status, 403, "old token revoked");
  assert.equal((await query(replacement, "session")).status, 200, "replacement token works");

  result = await query(replacement, "create", { slug: "jahat", policy: "self", document: prepareSite(blankSite("jahat")) });
  assert.equal(result.status, 403, "client cannot create websites");

  console.log("PASS generator PHP: authentication, tenant isolation, drafts, two modes, review, ZIP, token rotation");
}

try { await run(); }
finally {
  server.kill("SIGTERM");
  rmSync(testDir, { recursive: true, force: true });
}
