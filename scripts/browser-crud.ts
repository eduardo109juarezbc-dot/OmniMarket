/**
 * Revisión temporal de la tarea 8 en Chromium contra :3006 (Supabase LOCAL):
 * alta, edición y baja de productos, alta de pedidos y consola limpia.
 */
import { execSync } from "node:child_process";
import { createServerClient } from "@supabase/ssr";
import { chromium, expect } from "@playwright/test";

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

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ locale: "es-ES" });
  await context.addCookies(await cookies());
  const page = await context.newPage();
  const problems: string[] = [];
  const expected: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    // Chrome registra cualquier respuesta 4xx; aquí se provocan 409 a propósito.
    const list = /status of 409/.test(msg.text()) ? expected : problems;
    list.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`[pageerror] ${error.message}`));
  process.on("exit", () => console.log(`      409 provocados a propósito: ${expected.length}`));
  const step = (text: string) => console.log(`OK    ${text}`);

  // --- Productos -----------------------------------------------------------
  await page.goto(`${BASE}/products`, { waitUntil: "networkidle" });
  await expect(page.getByTestId("products-table").locator("tbody tr")).toHaveCount(20);
  step("tabla de productos: 20 filas");

  await page.getByTestId("products-search").fill("teclado");
  await expect(page.getByTestId("product-row-ELE-002")).toBeVisible();
  await expect(page.getByTestId("products-table").locator("tbody tr")).toHaveCount(1);
  await expect(page).toHaveURL(/\?q=teclado/);
  step("búsqueda con debounce y URL sincronizada");
  await page.getByTestId("products-search").fill("");

  // Validación en el cliente (errores por campo en español).
  await page.getByTestId("new-product").click();
  await page.getByTestId("product-submit").click();
  await expect(page.getByText("El SKU debe tener de 3 a 20 caracteres")).toBeVisible();
  await expect(page.getByText("Introduce un importe").first()).toBeVisible();
  step("validación de formulario en español");

  await page.getByLabel("SKU").fill("e2e-001");
  await page.getByLabel("Nombre").fill("Producto E2E");
  await page.getByLabel("Categoría", { exact: true }).selectOption("HOME");
  await page.getByLabel("Precio de venta").fill("19.99");
  await page.getByLabel("Costo unitario").fill("25");
  await page.getByTestId("product-submit").click();
  await expect(page.getByText("El costo no puede ser mayor que el precio")).toBeVisible();
  await page.getByLabel("Costo unitario").fill("8.5");
  await page.getByTestId("product-submit").click();
  await expect(page.getByText("Producto E2E-001 creado")).toBeVisible();
  await expect(page.getByTestId("product-row-E2E-001")).toBeVisible();
  step("alta de producto: toast y fila en la tabla");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("products-search").fill("E2E-001");
  await expect(page.getByTestId("product-row-E2E-001")).toBeVisible();
  step("el producto persiste tras recargar");

  // SKU duplicado: error del servidor junto al campo.
  await page.getByTestId("new-product").click();
  await page.getByLabel("SKU").fill("E2E-001");
  await page.getByLabel("Nombre").fill("Duplicado");
  await page.getByLabel("Precio de venta").fill("5");
  await page.getByLabel("Costo unitario").fill("1");
  await page.getByTestId("product-submit").click();
  await expect(page.getByText("Este SKU ya está en uso")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  step("SKU duplicado: error del servidor en el campo");

  // Edición.
  await page.getByRole("button", { name: "Editar E2E-001" }).click();
  await page.getByLabel("Stock").fill("42");
  await page.getByTestId("product-submit").click();
  await expect(page.getByText("Producto E2E-001 actualizado")).toBeVisible();
  await expect(page.getByTestId("product-row-E2E-001")).toContainText("42");
  step("edición de producto");

  // Baja de un producto con ventas → 409 y opción de desactivar.
  await page.getByTestId("products-search").fill("ELE-001");
  await page.getByRole("button", { name: "Eliminar ELE-001" }).click();
  await page.getByTestId("confirm-delete").click();
  await expect(page.getByText("no se puede eliminar")).toBeVisible();
  await expect(page.getByTestId("product-row-ELE-001")).toBeVisible();
  step("producto con ventas: rollback y toast con 'Desactivar'");

  // Baja de un producto sin ventas.
  await page.getByTestId("products-search").fill("E2E-001");
  await page.getByRole("button", { name: "Eliminar E2E-001" }).click();
  await page.getByTestId("confirm-delete").click();
  await expect(page.getByText("Producto E2E-001 eliminado")).toBeVisible();
  await expect(page.getByTestId("product-row-E2E-001")).toHaveCount(0);
  step("baja de producto sin ventas");

  // --- Pedidos -------------------------------------------------------------
  await page.goto(`${BASE}/orders?status=CANCELLED`, { waitUntil: "networkidle" });
  await expect(page.getByText("de 21 pedidos")).toBeVisible();
  step("filtro de estado desde la URL");

  await page.goto(`${BASE}/orders/new`, { waitUntil: "networkidle" });
  await page.getByTestId("order-submit").click();
  await expect(page.getByText("Identificador no válido").first()).toBeVisible();
  step("validación del formulario de pedido");

  await page.getByLabel("Cliente").selectOption({ index: 1 });
  await page.getByLabel("Producto 1", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Cantidad").first().fill("2");
  await page.getByTestId("add-line").click();
  await page.getByLabel("Producto 2", { exact: true }).selectOption({ index: 2 });
  await page.getByTestId("order-submit").click();
  await expect(page.getByText(/Pedido OM-0301 creado/)).toBeVisible();
  await expect(page).toHaveURL(/\/orders\?created=OM-0301/);
  await expect(page.getByTestId("order-row-OM-0301")).toBeVisible();
  step("alta de pedido: toast, redirección y fila resaltada OM-0301");

  const status0301 = await fetch(`${BASE}/api/test/kanban-status?code=OM-0301`).then((r) =>
    r.json(),
  );
  console.log("      kanban-status OM-0301:", status0301.status, "posición", status0301.position);

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
