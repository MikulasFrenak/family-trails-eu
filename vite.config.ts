/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  server: {
    watch: {
      ignored: ["**/e2e/fingerprints/**", "**/e2e/.healing-audit/**"],
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["node_modules/**", "e2e/**/*.spec.ts"],
  },
});