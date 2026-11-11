import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/pages",
  timeout: 30_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4187/namina-hosting/",
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "npx vite preview --outDir pages-preview-dist --base=/namina-hosting/ --host 127.0.0.1 --port 4187",
    url: "http://127.0.0.1:4187/namina-hosting/",
    reuseExistingServer: false,
  },
});
