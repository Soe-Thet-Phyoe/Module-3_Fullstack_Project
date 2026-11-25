import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const python = process.platform === "win32" ? "../server/.venv/Scripts/python.exe" : "../server/.venv/bin/python";
export default defineConfig({
  testDir: "./dashboard-e2e",
  outputDir: ".next/dashboard-test-results",
  use: { baseURL: "http://127.0.0.1:3932", channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: [
    { command: `"${existsSync(python) ? python : "python"}" dashboard-e2e/server.py`, url: "http://127.0.0.1:8932/api/shop/products/" },
    { cwd: "../admin", command: "node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3932",
      env: { DASHBOARD_BROWSER_TEST: "1", DJANGO_API_BASE_URL: "http://127.0.0.1:8932" }, url: "http://127.0.0.1:3932/login", timeout: 120000 },
  ],
});
