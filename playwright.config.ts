import { defineConfig, devices } from "@playwright/test";
import { E2E_BASE_URL, E2E_PORT, E2E_TEST_API_TOKEN, localSupabase } from "./e2e/env";

const supabase = localSupabase();
const isCI = Boolean(process.env.CI);

/**
 * Suite E2E (PDF §5): autenticación, creación y drag and drop.
 * La app se compila y se sirve contra el Supabase LOCAL, en su propia carpeta
 * de build (.next-e2e) y en el puerto 3100, para no interferir con `npm run dev`.
 */
export default defineConfig({
  testDir: "e2e",
  // Todos los tests comparten la base y la restablecen: se ejecutan en serie.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 7_500 },
  reporter: isCI
    ? [["github"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: E2E_BASE_URL,
    locale: "es-ES",
    timezoneId: "UTC",
    viewport: { width: 1600, height: 900 },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 900 } },
    },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${E2E_PORT}`,
    url: `${E2E_BASE_URL}/login`,
    reuseExistingServer: !isCI,
    timeout: 240_000,
    stdout: "ignore",
    stderr: "pipe",
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SUPABASE_URL: supabase.apiUrl,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
      DATABASE_URL: supabase.dbUrl,
      TEST_API_TOKEN: E2E_TEST_API_TOKEN,
      NEXT_PUBLIC_SITE_URL: E2E_BASE_URL,
      NEXT_PUBLIC_CURRENCY: "USD",
      NEXT_PUBLIC_LOCALE: "es-ES",
      NEXT_PUBLIC_TIME_ZONE: "UTC",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
