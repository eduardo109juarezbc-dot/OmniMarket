/** Captura temporal de pantallas (se elimina al terminar). Uso: npx tsx scripts/screenshot.ts /dashboard */
import { execSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { chromium } from "@playwright/test";

const status = JSON.parse(
  execSync("npx supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString(),
);

async function main() {
  const jar = new Map<string, string>();
  const client = createServerClient(status.API_URL, status.PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  await client.auth.signInWithPassword({
    email: "browser@omnimarket.test",
    password: "browser-password-123",
  });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    locale: "es-ES",
  });
  const paths = process.argv.slice(2);
  for (const path of paths) {
    if (path !== "/login") {
      await context.addCookies(
        [...jar].map(([name, value]) => ({ name, value, domain: "localhost", path: "/" })),
      );
    }
    const page = await context.newPage();
    await page.goto(`http://localhost:3006${path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const file = `screenshot${path.replace(/\W+/g, "-")}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
  }
  await browser.close();
}

void main();
