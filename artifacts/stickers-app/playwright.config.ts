import { defineConfig, devices } from "@playwright/test";

// Suite E2E/visivo — SOLO sviluppo/CI. Gira contro il Vite dev server su una
// porta dedicata; ogni test intercetta `**/api/**` (vedi tests/e2e/_setup.ts),
// quindi NON tocca backend, DB o servizi reali. Fuori da `src/` → mai nel bundle.

const PORT = 5199;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  expect: {
    timeout: 7_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: "disabled" },
  },
  use: { baseURL, trace: "on-first-retry" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],
  webServer: {
    command: "pnpm exec vite --config vite.config.ts",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { PORT: String(PORT), BASE_PATH: "/" },
  },
});
