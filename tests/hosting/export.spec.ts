import { expect, test, type Page } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function waitForVini(page: Page) {
  await expect(page.locator(".vini-cinema:not(.vini-cinema--loading)")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: /TEH VINI/i })).toBeVisible();
}

for (const viewport of viewports) {
  test(`hosting export matches existing Vini HTML on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    // The Dropbox video is not needed for testing local layout or controls.
    await page.route(/https?:\/\/[^/]*dropbox\.com\//, (route) => route.abort());

    const readLayout = async () => page.evaluate(() => {
      const box = (selector: string) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect();
        return { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) };
      };
      return {
        video: box(".vini-cinema__video"),
        headline: box(".vini-cinema__intro h1"),
        ticker: box(".vini-cinema__highlights"),
        nav: box(".vini-cinema__nav"),
      };
    });

    await page.goto("/vinihtml/", { waitUntil: "domcontentloaded" });
    await waitForVini(page);
    const reference = await readLayout();

    await page.goto("/vini/", { waitUntil: "domcontentloaded" });
    await waitForVini(page);
    expect(await readLayout()).toEqual(reference);

    const video = page.locator(".vini-cinema__video");
    await expect(video).toHaveAttribute("autoplay", "");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("playsinline", "");

    const before = await page.locator(".vini-cinema__highlights").evaluate((el) => el.scrollLeft);
    await page.waitForTimeout(700);
    const after = await page.locator(".vini-cinema__highlights").evaluate((el) => el.scrollLeft);
    expect(after).toBeGreaterThan(before);

    await page.getByRole("button", { name: "Produk", exact: true }).click({ force: true, timeout: 5_000 });
    await expect(page.locator(".vini-cinema__gallery-viewport")).toBeVisible();
    await page.locator('.vini-cinema__gallery-slide[aria-hidden="false"] button').first().click({ force: true, timeout: 5_000 });
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });

  test(`hosting landing works on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /KENALAN/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Buka contoh website interaktif Teh Vini" })).toHaveAttribute("href", "/vini");
    const waLinks = page.locator('a[href^="https://wa.me/"]');
    expect(await waLinks.count()).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
