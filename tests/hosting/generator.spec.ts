import { expect, test } from "@playwright/test";

test("admin creates a client, edits data, previews mobile, and publishes", async ({ page }) => {
  await page.setViewportSize({ width: 1365, height: 900 });
  const adminToken = "a".repeat(64);
  const clientToken = "b".repeat(64);
  let site: any = null;

  await page.route("**/api/generator.php?**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const action = url.searchParams.get("action");
    const body = req.method() === "POST" ? req.postDataJSON() : null;
    let response: object = { error: "Unknown action" };
    let status = 200;

    if (req.headers().authorization !== `Bearer ${adminToken}`) {
      response = { error: "Access denied" }; status = 403;
    } else if (action === "session") {
      response = { role: "admin", clients: site ? [{ slug: site.slug, policy: site.policy, revision: site.revision, publishedRevision: site.publishedRevision, pendingRevision: site.pendingRevision, updatedAt: site.updatedAt }] : [] };
    } else if (action === "create") {
      site = { slug: body.slug, policy: body.policy, document: body.document, revision: 1, publishedRevision: 0, pendingRevision: null, updatedAt: "2026-11-11T00:00:00Z" };
      response = { token: clientToken, slug: site.slug };
      status = 201;
    } else if (action === "site") {
      response = { site };
    } else if (action === "save") {
      expect(body.expectedRevision).toBe(site.revision);
      site.document = body.document;
      site.revision += 1;
      response = { revision: site.revision };
    } else if (action === "publish") {
      expect(body.expectedRevision).toBe(site.revision);
      site.publishedRevision = site.revision;
      response = { status: "published" };
    } else { status = 404; }

    await route.fulfill({ status, json: response });
  });

  await page.goto(`/generator/#token=${adminToken}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Generator Original/ })).toBeVisible();
  await page.getByText("+ Buat klien baru").click();
  await page.getByLabel("Slug website").fill("klien-demo");
  await page.getByLabel("Nama klien").fill("Rina Demo");
  await page.getByRole("button", { name: /Buat website & magic link/ }).click();
  await expect(page.getByLabel("Tautan editor klien")).toHaveValue(new RegExp(`/#token=${clientToken}$`));
  await expect(page.getByText("/klien-demo").first()).toBeVisible();

  await page.getByLabel("Profesi atau tagline").fill("Kreator Digital");
  await page.getByRole("button", { name: "Simpan draft" }).click();
  await expect(page.getByText("Draft aman tersimpan.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /02 Media/ }).click();
  await page.getByLabel("Video HP (opsional)").fill("https://www.dropbox.com/scl/fi/contoh/mobile.mp4?raw=1");
  await page.getByRole("button", { name: "Simpan draft" }).click();
  await expect(page.getByText("Draft aman tersimpan.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: /03 Hasil jadi/ }).click();
  await page.getByRole("button", { name: "HP", exact: true }).click();
  await expect(page.locator(".generator-canvas--mobile")).toBeVisible();
  await page.getByRole("button", { name: "PC", exact: true }).click();
  await expect(page.locator(".generator-canvas--desktop")).toBeVisible();
  await page.getByRole("button", { name: "HP", exact: true }).click();
  const iframe = page.frameLocator('iframe[title="Pratinjau klien-demo"]');
  await expect(iframe.locator(".vini-cinema")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Publish sekarang" }).click();
  await expect(page.getByText("Website /klien-demo sudah terbit.")).toBeVisible();
  expect(site.document.content.identity.profession).toBe("Kreator Digital");
  expect(site.document.media.mobileVideo).toContain("mobile.mp4");
  expect(site.publishedRevision).toBe(3);
});
