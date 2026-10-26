/**
 * Revisión temporal en navegador real (Chromium de Playwright) contra :3006 con
 * el Supabase LOCAL: errores de consola, render del dashboard y tiempo real.
 * Se elimina al terminar; los E2E definitivos están en e2e/ (tarea 11).
 */
import { execSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import postgres from "postgres";

const BASE = "http://localhost:3006";
const status = JSON.parse(
  execSync("npx supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString(),
);
const paths = process.argv.slice(2).filter((arg) => arg.startsWith("/"));

async function sessionCookies() {
  const email = "browser@omnimarket.test";
  const password = "browser-password-123";
  const admin = createClient(status.API_URL, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Revisión Navegador" },
  });
  if (error && !/already/i.test(error.message)) throw error;
  const jar = new Map<string, string>();
  const client = createServerClient(status.API_URL, status.PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return [...jar].map(([name, value]) => ({ name, value, domain: "localhost", path: "/" }));
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: "es-ES" });
  await context.addCookies(await sessionCookies());
  const page = await context.newPage();
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning")
      problems.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`[pageerror] ${error.message}`));

  for (const path of paths.length ? paths : ["/dashboard"]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    console.log(`${path}: título "${await page.title()}"`);
  }

  if (!paths.length || paths.includes("/dashboard")) {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    const revenue = await page.getByTestId("kpi-revenue").textContent();
    console.log("KPI ingresos:", revenue?.replace(/\s+/g, " "));
    console.log(
      "filas de ventas:",
      await page.locator('[data-testid="sales-table"] tbody tr').count(),
    );
    await page
      .getByTestId("live-indicator")
      .and(page.locator('[data-status="live"]'))
      .waitFor({ timeout: 15_000 });
    console.log("tiempo real: En vivo");

    // Requisito 9.4: un cambio en la base se refleja en ≤ 5 s sin recargar.
    const before = await page.getByTestId("kpi-orders").textContent();
    const sql = postgres(status.DB_URL, { max: 1, onnotice: () => {} });
    const started = Date.now();
    await sql`update orders set status = 'CANCELLED', updated_at = now() where code = 'OM-0002'`;
    await page.waitForFunction(
      (previous) => document.querySelector('[data-testid="kpi-orders"]')?.textContent !== previous,
      before,
      { timeout: 5_000 },
    );
    console.log(
      `dashboard actualizado en ${Date.now() - started} ms: "${before?.replace(/\s+/g, " ")}" -> "${(await page.getByTestId("kpi-orders").textContent())?.replace(/\s+/g, " ")}"`,
    );
    await sql.end();

    await page.getByRole("button", { name: "Siguiente" }).click();
    await page.getByText("Página 2 de 30").waitFor();
    console.log("paginación: página 2 de 30");
    await page.getByRole("button", { name: "30 días" }).click();
    await page.waitForLoadState("networkidle");
    console.log(
      "rango 30 días:",
      (await page.getByTestId("kpi-orders").textContent())?.replace(/\s+/g, " "),
    );
  }

  console.log(
    problems.length
      ? `\nConsola:\n${problems.join("\n")}`
      : "\nConsola limpia: 0 errores, 0 avisos",
  );
  await browser.close();
  process.exit(problems.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
