import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/hosting",
  timeout: 45_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4185",
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
        : {}),
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "python3 -m http.server 4185 --bind 127.0.0.1 --directory hosting-dist",
    url: "http://127.0.0.1:4185/",
    reuseExistingServer: false,
  },
});
