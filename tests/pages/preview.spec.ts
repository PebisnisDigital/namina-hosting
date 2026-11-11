import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`Pages preview links and profile work at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route(/https?:\/\/[^/]*dropbox\.com\//, (route) => route.abort());
    await page.goto("./", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /KENALAN/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Buka contoh website interaktif Teh Vini" }))
      .toHaveAttribute("href", "/namina-hosting/vini/");
    await page.getByRole("link", { name: "Buka contoh website interaktif Teh Vini" }).click();
    await expect(page.getByRole("heading", { name: /TEH VINI/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".vini-cinema__video")).toHaveAttribute("autoplay", "");
    await expect(page.locator(".vini-cinema__video")).toHaveAttribute("loop", "");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);

    await page.goto("/namina-hosting/privacy/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    await page.goto("/namina-hosting/terms/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
  });
}
