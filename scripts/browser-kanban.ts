/** Revisión temporal del Kanban (tarea 9) en Chromium contra :3006 (Supabase LOCAL). */
import { execSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { chromium, expect, type Locator, type Page } from "@playwright/test";

const BASE = "http://localhost:3006";
const status = JSON.parse(
  execSync("npx supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString(),
);

async function cookies() {
  const jar = new Map<string, string>();
  const client = createServerClient(status.API_URL, status.PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email: "browser@omnimarket.test",
    password: "browser-password-123",
  });
  if (error) throw error;
  return [...jar].map(([name, value]) => ({ name, value, domain: "localhost", path: "/" }));
}

/** Arrastre con el ratón en varios pasos (el PointerSensor necesita moverse > 5 px). */
async function drag(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Sin caja para arrastrar");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 20 });
  await page.mouse.up();
}

const kanbanStatus = (code: string) =>
  fetch(`${BASE}/api/test/kanban-status?code=${code}`).then((r) => r.json());

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    locale: "es-ES",
    viewport: { width: 1600, height: 900 },
  });
  await context.addCookies(await cookies());
  const page = await context.newPage();
  const problems: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    if (/status of 500/.test(msg.text())) return; // 500 simulado a propósito
    problems.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`[pageerror] ${error.message}`));
  const step = (text: string) => console.log(`OK    ${text}`);

  await page.goto(`${BASE}/kanban`, { waitUntil: "networkidle" });
  const card = page.getByTestId("kanban-card-OM-0001");
  const pending = page.getByTestId("kanban-column-PENDING");
  const processing = page.getByTestId("kanban-column-PROCESSING");
  await expect(pending.getByTestId("kanban-card-OM-0001")).toBeVisible();
  await expect(page.getByTestId("kanban-count-PENDING")).toHaveText("45");
  step("tablero: OM-0001 en Pendiente (45 pedidos)");

  // 1. Arrastre con ratón entre columnas.
  await drag(page, card, processing);
  await expect(processing.getByTestId("kanban-card-OM-0001")).toBeVisible();
  await expect(page.getByText('OM-0001 movido a "En proceso"')).toBeVisible();
  step("arrastre con ratón a En proceso + toast");
  await expect.poll(async () => (await kanbanStatus("OM-0001")).status).toBe("PROCESSING");
  step(`kanban-status: PROCESSING, posición ${(await kanbanStatus("OM-0001")).position}`);
  await page.reload({ waitUntil: "networkidle" });
  await expect(processing.getByTestId("kanban-card-OM-0001")).toBeVisible();
  step("persiste tras recargar");

  // 2. Fallo del servidor: rollback optimista + toast de error.
  await page.route("**/api/orders/*/move", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Error simulado" } }),
    }),
  );
  await drag(
    page,
    processing.getByTestId("kanban-card-OM-0001"),
    page.getByTestId("kanban-column-SHIPPED"),
  );
  await expect(page.getByText(/No se pudo mover OM-0001\. Se restauró su posición/)).toBeVisible();
  await expect(processing.getByTestId("kanban-card-OM-0001")).toBeVisible();
  await page.unroute("**/api/orders/*/move");
  expect((await kanbanStatus("OM-0001")).status).toBe("PROCESSING");
  step("error del servidor: la tarjeta vuelve a En proceso y toast de error");

  // 3. Teclado: Espacio, flecha derecha, Espacio.
  const liveRegion = page.locator('[id^="DndLiveRegion"]');
  await processing.getByTestId("kanban-card-OM-0001").focus();
  console.log(
    "      foco en:",
    await page.evaluate(() => document.activeElement?.getAttribute("data-testid")),
  );
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  console.log("      tras Espacio:", await liveRegion.textContent());
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  console.log("      tras flecha:", await liveRegion.textContent());
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  console.log("      tras soltar:", await liveRegion.textContent());
  await expect(
    page.getByTestId("kanban-column-PACKED").getByTestId("kanban-card-OM-0001"),
  ).toBeVisible();
  await expect.poll(async () => (await kanbanStatus("OM-0001")).status).toBe("PACKED");
  step("teclado: movido a Empaquetado");

  // 4. Reordenar dentro de la misma columna (al principio).
  const packed = page.getByTestId("kanban-column-PACKED");
  const firstPacked = packed.locator("[data-testid^=kanban-card-]").first();
  const firstCode = (await firstPacked.getAttribute("data-testid"))?.replace("kanban-card-", "");
  if (firstCode !== "OM-0001") {
    const from = await packed.getByTestId("kanban-card-OM-0001").boundingBox();
    const to = await firstPacked.boundingBox();
    if (from && to) {
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 10, { steps: 5 });
      await page.mouse.move(to.x + to.width / 2, to.y + 5, { steps: 25 });
      await page.mouse.up();
    }
  }
  await expect.poll(async () => (await kanbanStatus("OM-0001")).position).toBe(0);
  step("reordenado al principio de Empaquetado (posición 0)");

  console.log(
    problems.length
      ? `\nConsola:\n${problems.join("\n")}`
      : "\nConsola limpia: 0 errores, 0 avisos",
  );
  await browser.close();
  process.exit(problems.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
