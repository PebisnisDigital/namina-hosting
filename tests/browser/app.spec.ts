import { test, expect } from "@playwright/test";
import { backend } from "./backend";
const errors = new WeakMap<import("@playwright/test").Page, string[]>();
test.beforeEach(async ({ page }) => {
  const messages: string[] = [];
  errors.set(page, messages);
  page.on("pageerror", (error) => messages.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
async function login(
  page: import("@playwright/test").Page,
  email = "a@example.test",
) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("Testing-only-123");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Website saya", exact: true }),
  ).toBeVisible();
}
test("client editing, autosave, iframe selection, draft isolation, publish, history, preview revoke and logout", async ({
  page,
  context,
}) => {
  const server = await backend(context);
  try {
    await login(page);
    await page.getByRole("link", { name: "Edit web", exact: true }).click();
    const name = page.getByLabel("Nama tampilan");
    await expect(name).toBeVisible();
    await name.fill("Cerita Klien A");
    await expect(page.locator(".studio-status")).toHaveText("Tersimpan");
    const canvas = page.frameLocator("iframe");
    await expect(page.locator("iframe")).toHaveJSProperty("clientWidth", 1280);
    await expect(canvas.locator(".cinematic-hero__stamp--name")).toHaveText(
      "Cerita Klien A",
    );
    await canvas.locator("[data-edit=wallet]").click();
    await expect(
      page.getByRole("heading", { name: "Dompet", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Warna dompet").fill("#774422");
    await page
      .getByRole("button", { name: "Tambah kartu", exact: true })
      .click();
    await page.getByLabel("Judul kartu", { exact: true }).fill("Kontak");
    await page
      .getByLabel("Tautan / WhatsApp (https://wa.me/…)")
      .fill("https://wa.me/628123456789");
    await page
      .getByRole("button", { name: "Duplikat kartu", exact: true })
      .click();
    await expect(page.locator(".studio-layers ol li")).toHaveCount(3);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.locator(".studio-layers ol li")).toHaveCount(2);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await expect(page.locator(".studio-layers ol li")).toHaveCount(3);
    await page
      .getByRole("button", { name: "Hapus kartu", exact: true })
      .click();
    await expect(page.locator(".studio-layers ol li")).toHaveCount(2);
    await page.getByRole("button", { name: "HP preview", exact: true }).count();
    await page
      .getByRole("button", { name: "Desktop preview", exact: true })
      .click();
    await expect(page.locator("iframe")).toHaveJSProperty("clientWidth", 374);
    await page
      .getByRole("button", { name: "Simpan / coba lagi", exact: true })
      .click();
    await expect(page.locator(".studio-status")).toHaveText("Tersimpan");
    await page.reload();
    await expect(page.getByLabel("Nama tampilan")).toHaveValue(
      "Cerita Klien A",
    );
    const before = await page.request.get("/client-a");
    expect(before.ok()).toBeTruthy(); // SPA delivery only, not a published database snapshot.
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(
      page.getByText("Website berhasil dipublikasikan."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Identitas & foto", exact: true })
      .click();
    await page.getByLabel("Nama tampilan").fill("Draft privat baru");
    await expect(page.locator(".studio-status")).toHaveText("Tersimpan");
    const pub = await context.newPage();
    await pub.goto("/client-a");
    await pub.getByRole("button", { name: "LIHAT PROFIL" }).click();
    await expect(pub.locator(".cinematic-hero__stamp--name")).toHaveText(
      "Cerita Klien A",
    );
    await pub.close();
    await page
      .getByRole("button", { name: "Buat tautan preview 1 jam", exact: true })
      .click();
    const url = await page
      .getByRole("link", { name: "Buka preview sementara" })
      .getAttribute("href");
    const preview = await context.newPage();
    await preview.goto(url!);
    await preview.getByRole("button", { name: "LIHAT PROFIL" }).click();
    await expect(preview.locator(".cinematic-hero__stamp--name")).toHaveText(
      "Draft privat baru",
    );
    await page
      .getByRole("button", { name: "Cabut semua tautan preview", exact: true })
      .click();
    await preview.reload();
    await expect(
      preview.getByText(
        "Preview tidak tersedia, kedaluwarsa, atau telah dicabut.",
      ),
    ).toBeVisible();
    await preview.close();
    await page
      .getByRole("button", { name: "Riwayat versi", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Pulihkan ke draft", exact: true })
      .first()
      .click();
    await expect(page.getByLabel("Nama tampilan")).toHaveValue(
      "Cerita Klien A",
    );
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Keluar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Kembali ke cerita Anda." }),
    ).toBeVisible();
  } finally {
    await server.close();
  }
});
test("offline/error retry and stale tab conflict preserve unsaved text", async ({
  page,
  context,
}) => {
  const server = await backend(context);
  try {
    await login(page);
    await page.getByRole("link", { name: "Edit web", exact: true }).click();
    server.failSaves(true);
    await page.getByLabel("Nama tampilan").fill("Belum tersimpan");
    await expect(page.locator(".studio-status")).toContainText(
      "Simulasi koneksi gagal",
    );
    server.failSaves(false);
    await page
      .getByRole("button", { name: "Simpan / coba lagi", exact: true })
      .click();
    await expect(page.locator(".studio-status")).toHaveText("Tersimpan");
    const other = await context.newPage();
    await other.goto(page.url());
    await expect(other.getByLabel("Nama tampilan")).toHaveValue(
      "Belum tersimpan",
    );
    await page.getByLabel("Nama tampilan").fill("Versi tab pertama");
    await expect(page.locator(".studio-status")).toHaveText("Tersimpan");
    await other.getByLabel("Nama tampilan").fill("Teks tab kedua");
    await expect(other.locator(".studio-status")).toContainText(
      "Konflik versi",
    );
    await expect(other.getByLabel("Nama tampilan")).toHaveValue(
      "Teks tab kedua",
    );
    await other.close();
  } finally {
    await server.close();
  }
});
test("admin provisions an invited fixture client, suspends and edits slug; clients cannot enter admin", async ({
  page,
  context,
}) => {
  const server = await backend(context);
  try {
    await login(page, "admin@example.test");
    await page.goto("/admin/sites");
    await expect(
      page.getByRole("heading", { name: "Superadmin", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Klien", exact: true })
      .selectOption({ label: "c@example.test" });
    await page.getByLabel("Slug publik").fill("client-c");
    await page.getByRole("button", { name: "Buat website draft" }).click();
    await expect(
      page.getByText("Website ORIGINAL disiapkan sebagai draft."),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "/client-c", exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Atur slug / status" })
      .first()
      .click();
    await page
      .getByLabel("Slug", { exact: true })
      .last()
      .fill("renamed-client");
    await page.getByLabel("Alasan perubahan").fill("Pemeriksaan QA");
    await page.getByRole("button", { name: "Simpan & tangguhkan" }).click();
    await expect(page.getByText("Website diperbarui.")).toBeVisible();
    await page.goto("/admin/templates");
    await expect(page.getByLabel("Durasi video (detik)")).toHaveValue("120");
    await page.getByRole("button", { name: "Simpan template & kuota" }).click();
    await expect(page.getByText("Pengaturan tersimpan.")).toBeVisible();
    await page.goto("/admin/orders");
    await expect(
      page.getByText("Penjualan dan pembayaran belum diaktifkan.", {
        exact: false,
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Keluar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Kembali ke cerita Anda." }),
    ).toBeVisible();
    await login(page);
    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Akses superadmin" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Superadmin", exact: true }),
    ).toHaveCount(0);
  } finally {
    await server.close();
  }
});
for (const width of [390, 768, 1440])
  test(`ORIGINAL wallet and card, video failure, reduced motion and mobile layout ${width}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("**/videos/hero.mp4", (route) => route.abort());
    await page.goto("/demo");
    await page.getByRole("button", { name: "LIHAT PROFIL" }).click();
    await page.locator(".cinematic-hero__wallet").click();
    await expect(
      page.getByRole("heading", { name: "Nama", exact: true }),
    ).toBeVisible();
    await page.waitForTimeout(2000);
    await page.locator(".cinematic-hero__card-viewport").focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("heading", { name: "Bandung", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({ path: `qa/original-${width}.png` });
  });

test("Studio uploads real PNG and MP4, validates bytes, autosaves media and publishes references", async ({
  page,
  context,
}) => {
  const server = await backend(context);
  try {
    await login(page);
    await page.getByRole("link", { name: "Edit web", exact: true }).click();
    await page
      .getByLabel("Foto profil", { exact: true })
      .setInputFiles("public/favicon.svg");
    await expect(
      page.getByText("Jenis atau ukuran file tidak didukung.", {
        exact: false,
      }),
    ).toBeVisible();
    const png = await (
      await import("sharp")
    )
      .default({
        create: { width: 64, height: 64, channels: 3, background: "#806020" },
      })
      .png()
      .toBuffer();
    await page.getByLabel("Foto profil", { exact: true }).setInputFiles({
      name: "profile.png",
      mimeType: "image/png",
      buffer: png,
    });
    await expect(
      page.getByText("Media terverifikasi dan ditambahkan ke draft."),
    ).toBeVisible();
    await expect(
      page.frameLocator("iframe").locator(".namana-portrait"),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Latar & video", exact: true })
      .click();
    await page
      .getByLabel("Video desktop (MP4)", { exact: true })
      .setInputFiles("public/videos/hero.mp4");
    await expect(
      page.getByText("Media terverifikasi dan ditambahkan ke draft."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Simpan / coba lagi", exact: true })
      .click();
    await expect(page.locator(".studio-status")).toHaveText("Tersimpan");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(
      page.getByText("Website berhasil dipublikasikan."),
    ).toBeVisible();
    await page.locator("summary", { hasText: "Media website" }).click();
    await expect(page.getByText("image/png •", { exact: false })).toBeVisible();
    await expect(page.getByText("video/mp4 •", { exact: false })).toBeVisible();
    await page.screenshot({ path: "qa/studio-media.png", fullPage: true });
    const publicPage = await context.newPage();
    await publicPage.goto("/client-a");
    await publicPage.getByRole("button", { name: "LIHAT PROFIL" }).click();
    await expect(publicPage.locator(".namana-portrait")).toBeVisible();
    await expect(publicPage.locator("video source")).toHaveAttribute(
      "src",
      /test-media/,
    );
    await publicPage.close();
  } finally {
    await server.close();
  }
});
