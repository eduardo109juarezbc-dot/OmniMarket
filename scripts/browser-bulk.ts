/** Revisión temporal de la edición en lote (tarea 10) en Chromium contra :3006 (Supabase LOCAL). */
import { execSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { chromium, expect } from "@playwright/test";

const BASE = "http://localhost:3006";
const status = JSON.parse(execSync("npx supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString());

async function cookies() {
  const jar = new Map<string, string>();
  const client = createServerClient(status.API_URL, status.PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email: "browser@omnimarket.test", password: "browser-password-123" });
  if (error) throw error;
  return [...jar].map(([name, value]) => ({ name, value, domain: "localhost", path: "/" }));
}

const columnCount = async (s: string) =>
  ((await fetch(`${BASE}/api/test/kanban-status`).then((r) => r.json())) as { columns: { status: string; count: number }[] })
    .columns.find((c) => c.status === s)?.count;

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: "es-ES" });
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

  // --- Pedidos: fallo simulado → rollback -----------------------------------
  await page.goto(`${BASE}/orders?status=PENDING`, { waitUntil: "networkidle" });
  await expect(page.getByText("1–20 de 45 pedidos")).toBeVisible();
  await page.getByTestId("select-all-orders").check();
  await expect(page.getByTestId("bulk-bar")).toContainText("20 pedidos seleccionados");
  step("seleccionar toda la página: 20");

  await page.route("**/api/orders/bulk", (route) =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Error simulado" } }) }),
  );
  await page.getByTestId("bulk-status").selectOption("SHIPPED");
  await page.getByTestId("bulk-apply").click();
  await expect(page.getByText(/No se pudieron actualizar los 20 registros\. Se restauraron los valores/)).toBeVisible();
  await expect(page.getByTestId("orders-table").getByText("Pendiente")).toHaveCount(20);
  await page.unroute("**/api/orders/bulk");
  expect(await columnCount("PENDING")).toBe(45);
  step("error del servidor: los 20 vuelven a Pendiente y toast de error");

  // --- Pedidos: éxito --------------------------------------------------------
  await page.getByTestId("select-all-orders").check();
  await page.getByTestId("bulk-status").selectOption("SHIPPED");
  await page.getByTestId("bulk-apply").click();
  await expect(page.getByText('20 pedidos actualizados a "Enviado"')).toBeVisible();
  await expect(page.getByText("1–20 de 25 pedidos")).toBeVisible();
  expect(await columnCount("PENDING")).toBe(25);
  expect(await columnCount("SHIPPED")).toBe(80);
  step("20 pedidos a Enviado: Pendiente 25, Enviado 80 (kanban-status)");

  // --- Productos --------------------------------------------------------------
  await page.goto(`${BASE}/products`, { waitUntil: "networkidle" });
  for (const sku of ["ELE-006", "ELE-001", "DEP-005"]) {
    await page.getByRole("checkbox", { name: `Seleccionar ${sku}` }).check();
  }
  await expect(page.getByTestId("bulk-bar")).toContainText("3 productos seleccionados");
  await page.getByTestId("bulk-deactivate").click();
  await expect(page.getByText("3 productos desactivados")).toBeVisible();
  for (const sku of ["ELE-006", "ELE-001", "DEP-005"]) {
    await expect(page.getByTestId(`product-row-${sku}`)).toContainText("Inactivo");
  }
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByTestId("product-row-ELE-001")).toContainText("Inactivo");
  step("3 productos desactivados y persistido");

  console.log(problems.length ? `\nConsola:\n${problems.join("\n")}` : "\nConsola limpia: 0 errores, 0 avisos");
  await browser.close();
  process.exit(problems.length ? 1 : 0);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
