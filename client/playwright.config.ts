import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const venvPython = process.platform === "win32" ? "../server/.venv/Scripts/python.exe" : "../server/.venv/bin/python";
const apiPort = Number(process.env.CART_TEST_API_PORT || 8931);
const webPort = Number(process.env.CART_TEST_WEB_PORT || 3931);
const apiBase = `http://127.0.0.1:${apiPort}`;
const webBase = `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: ".next/cart-test-results",
  timeout: 90_000,
  use: {
    baseURL: webBase,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    viewport: { width: 390, height: 844 },
  },
  webServer: [
    {
      command: `"${existsSync(venvPython) ? venvPython : "python"}" e2e/cart_server.py`,
      url: `${apiBase}/api/shop/products/`,
    },
    {
      command: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${webPort}`,
      env: { DJANGO_API_BASE_URL: apiBase, CART_BROWSER_TEST: "1" },
      url: webBase,
    },
  ],
});

