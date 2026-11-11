import { expect, test, type Page } from "@playwright/test";

const layouts = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

async function waitForProfile(page: Page) {
  await expect(page.locator(".vini-cinema:not(.vini-cinema--loading)")).toBeVisible({ timeout: 12000 });
  await expect(page.getByRole("heading", { name: /TEH VINI/i })).toBeVisible();
}

for (const viewport of layouts) {
  test(`static HTML matches /vini on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    await page.goto("/vini");
    await waitForProfile(page);
    const original = await page.evaluate(() => {
      const pick = (selector: string) => {
        const el = document.querySelector(selector)!;
        const rect = el.getBoundingClientRect();
        return {
          left: Math.round(rect.left), top: Math.round(rect.top),
          width: Math.round(rect.width), height: Math.round(rect.height),
          display: getComputedStyle(el).display,
        };
      };
      return {
        menu: pick(".vini-cinema__nav"),
        video: pick(".vini-cinema__video"),
        title: pick(".vini-cinema__intro h1"),
        tickerAnimation: getComputedStyle(document.querySelector(".vini-cinema__highlight-track")!).animationName,
      };
    });

    await page.goto("/vinihtml/");
    await waitForProfile(page);
    const exported = await page.evaluate(() => {
      const pick = (selector: string) => {
        const el = document.querySelector(selector)!;
        const rect = el.getBoundingClientRect();
        return {
          left: Math.round(rect.left), top: Math.round(rect.top),
          width: Math.round(rect.width), height: Math.round(rect.height),
          display: getComputedStyle(el).display,
        };
      };
      return {
        menu: pick(".vini-cinema__nav"),
        video: pick(".vini-cinema__video"),
        title: pick(".vini-cinema__intro h1"),
        tickerAnimation: getComputedStyle(document.querySelector(".vini-cinema__highlight-track")!).animationName,
      };
    });

    expect(exported).toEqual(original);
    expect(exported.tickerAnimation).not.toBe("none");
    const video = page.locator(".vini-cinema__video");
    await expect(video).toHaveAttribute("autoplay", "");
    await expect(video).toHaveAttribute("loop", "");
    await expect(video).toHaveAttribute("playsinline", "");
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime)).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Produk", exact: true }).click();
    await expect(page.locator(".vini-cinema__gallery-track")).toBeVisible();
    const animation = await page.locator(".vini-cinema__gallery-track").evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).not.toBe("none");
    await page.screenshot({ path: `qa/vinihtml-${viewport.name}.png`, fullPage: true });
  });
}
