import { expect, test } from "@playwright/test";

for (const width of [320, 390, 430]) {
  test(`NAMINA Original mobile overlaps the film and fixes icon navigation below at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.route("**/www.dropbox.com/**", (route) => route.abort());
    await page.goto("/vini");

    const screen = page.locator(".vini-cinema");
    await expect(screen).toBeVisible({ timeout: 15000 });
    await expect(screen.locator(".vini-cinema__nav")).toBeVisible();
    await expect(screen.locator(".vini-cinema__menu-toggle")).toBeHidden();
    await expect(screen.getByRole("link", { name: "Japri Saya!" })).toBeVisible();

    const layout = await page.evaluate(() => {
      const header = document.querySelector(".vini-cinema__header")!.getBoundingClientRect();
      const stage = document.querySelector(".vini-cinema__stage")!.getBoundingClientRect();
      const main = document.querySelector(".vini-cinema__main")!.getBoundingClientRect();
      const nav = document.querySelector(".vini-cinema__nav")!.getBoundingClientRect();
      const navTargets = [...document.querySelectorAll<HTMLButtonElement>(".vini-cinema__nav button")];
      return {
        headerBottom: header.bottom,
        videoTop: stage.top,
        videoBottom: stage.bottom,
        contentTop: main.top,
        videoHeight: stage.height,
        navBottom: nav.bottom,
        navTop: nav.top,
        navIconCount: document.querySelectorAll(".vini-cinema__nav-icon").length,
        contentBottomPadding: parseFloat(getComputedStyle(document.querySelector(".vini-cinema__main")!).paddingBottom),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        navHeights: navTargets.map((button) => button.getBoundingClientRect().height),
      };
    });
    expect(layout.videoTop).toBeGreaterThanOrEqual(layout.headerBottom - 1);
    expect(layout.contentTop).toBeGreaterThan(layout.videoTop + layout.videoHeight * 0.35);
    expect(layout.contentTop).toBeLessThan(layout.videoTop + layout.videoHeight * 0.7);
    expect(layout.videoHeight).toBeGreaterThanOrEqual(370);
    expect(layout.navBottom).toBeCloseTo(844, 0);
    expect(layout.navTop).toBeGreaterThan(700);
    expect(layout.navIconCount).toBe(5);
    expect(layout.contentBottomPadding).toBeGreaterThan(80);
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.navHeights).toHaveLength(5);
    expect(Math.min(...layout.navHeights)).toBeGreaterThanOrEqual(44);

    await expect(screen.getByRole("button", { name: "Putar slide otomatis" })).toHaveCount(0);
    const identityViewport = screen.locator(".vini-cinema__highlights");
    await expect(identityViewport).toHaveCSS("overflow-x", "auto");
    const identityBefore = await identityViewport.evaluate((element) => element.scrollLeft);
    await page.waitForTimeout(900);
    const identityAfter = await identityViewport.evaluate((element) => element.scrollLeft);
    expect(identityAfter).toBeGreaterThan(identityBefore + 20);

    await screen.locator(".vini-cinema__nav").getByRole("button", { name: "Karya" }).click();
    await expect(screen.locator(".vini-cinema__section-title")).toContainText("Karya");
    const after = await page.evaluate(() => ({
      headerBottom: document.querySelector(".vini-cinema__header")!.getBoundingClientRect().bottom,
      videoTop: document.querySelector(".vini-cinema__stage")!.getBoundingClientRect().top,
      contentTop: document.querySelector(".vini-cinema__main")!.getBoundingClientRect().top,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(after.headerBottom).toBeCloseTo(layout.headerBottom, 0);
    expect(after.videoTop).toBeCloseTo(layout.videoTop, 0);
    expect(after.contentTop).toBeCloseTo(layout.contentTop, 0);
    expect(after.documentWidth).toBeLessThanOrEqual(width + 1);

    await screen.locator(".vini-cinema__nav").getByRole("button", { name: "Produk" }).click();
    const productViewport = screen.locator(".vini-cinema__gallery-viewport");
    await expect(productViewport).toHaveCSS("overflow-x", "auto");
    const productBefore = await productViewport.evaluate((element) => element.scrollLeft);
    await page.waitForTimeout(900);
    const productAfter = await productViewport.evaluate((element) => element.scrollLeft);
    expect(productAfter).toBeGreaterThan(productBefore + 20);

    const bounds = await productViewport.boundingBox();
    expect(bounds).not.toBeNull();
    const startX = bounds!.x + bounds!.width * .75;
    const endX = bounds!.x + bounds!.width * .25;
    const pointerY = bounds!.y + bounds!.height * .5;
    await page.mouse.move(startX, pointerY);
    await page.mouse.down();
    await page.mouse.move(endX, pointerY, { steps: 10 });
    await page.mouse.up();
    const afterDrag = await productViewport.evaluate((element) => element.scrollLeft);
    expect(afterDrag).toBeGreaterThan(productAfter + 50);
    await page.waitForTimeout(1500);
    const afterResume = await productViewport.evaluate((element) => element.scrollLeft);
    expect(afterResume).toBeGreaterThan(afterDrag + 10);
  });
}

test("NAMINA Original desktop sliders auto-run without playback controls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/www.dropbox.com/**", (route) => route.abort());
  await page.goto("/vini");
  const screen = page.locator(".vini-cinema");
  await expect(screen).toBeVisible({ timeout: 15000 });
  await expect(screen.getByRole("button", { name: "Putar slide otomatis" })).toHaveCount(0);
  const viewport = screen.locator(".vini-cinema__highlights");
  const before = await viewport.evaluate((element) => element.scrollLeft);
  await page.waitForTimeout(1000);
  const after = await viewport.evaluate((element) => element.scrollLeft);
  expect(after).toBeGreaterThan(before + 20);
});
