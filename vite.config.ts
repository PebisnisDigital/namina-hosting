import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { devApi } from "./dev-api.ts";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), devApi(mode)],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        vini: fileURLToPath(new URL("./vini/index.html", import.meta.url)),
        vinihtml: fileURLToPath(new URL("./vinihtml/index.html", import.meta.url)),
      },
    },
  },
  server: {
    watch: {
      ignored: ["**/qa/**", "**/test-results/**", "**/tests/**", "**/*.md"],
    },
  },
}));
