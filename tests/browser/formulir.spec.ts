import { expect, test } from "@playwright/test";

test("client brief has accessible sections and validates essentials", async ({ page }) => {
  await page.goto("/formulir");
  await expect(page).toHaveTitle("Formulir Klien | NAMINA.PRO");
  await expect(page.getByRole("heading", { name: "Setiap nama punya cerita." })).toBeVisible();
  await expect(page.getByLabel("Nama lengkap", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "informasi privasi" })).toHaveAttribute("href", "/privacy");
  await page.getByRole("button", { name: "Kirim biodata" }).click();
  expect(await page.locator("input[name=fullName]").evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
});

test("submitting a valid brief confirms an ID", async ({ page }) => {
  await page.route("**/api/formulir", async (route) => {
    const body = route.request().postDataJSON() as { brief: { fullName: string; profession: string; whatsapp: string; consent: boolean } };
    expect(body.brief.fullName).toBe("Klien Uji Browser");
    expect(body.brief.profession).toBe("Pengajar");
    expect(body.brief.consent).toBe(true);
    await route.fulfill({ status: 201, contentType: "application/json", body: '{"id":"9b8c7842-b783-4f3f-a75a-6e46872b118a"}' });
  });
  await page.goto("/formulir");
  await page.locator("#brief-fullName").fill("Klien Uji Browser");
  await page.locator("#brief-profession").fill("Pengajar");
  await page.locator("#brief-whatsapp").fill("081234567890");
  await page.locator("input[name=consent]").check();
  await page.getByRole("button", { name: "Kirim biodata" }).click();
  await expect(page.getByText("NM-9B8C7842")).toBeVisible();
  await page.getByRole("button", { name: "Isi formulir lain" }).click();
  await expect(page.locator("#brief-fullName")).toBeVisible();
});

test("mobile form reflows without sideways overflow", async ({ page }) => {
  for (const width of [360, 600, 850, 1280]) {
    await page.setViewportSize({ width, height: 860 });
    await page.goto("/formulir");
    const result = await page.evaluate(() => ({
      total: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(result.total, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(result.viewport);
    await expect(page.getByRole("button", { name: "Kirim biodata" })).toBeAttached();
  }
});
