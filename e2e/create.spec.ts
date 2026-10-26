/**
 * Flujo E2E 2 — Creación (PDF §5): registro de un producto y de un pedido
 * nuevos y validación de su reflejo en la tabla.
 */
import { STORAGE_STATE } from "./env";
import { expect, kanbanStatus, test } from "./fixtures";

test.use({ storageState: STORAGE_STATE });

test("crear un producto lo muestra en la tabla y persiste", async ({ page }) => {
  await page.goto("/products");
  await page.getByTestId("new-product").click();

  // Validación en el cliente con los esquemas Zod compartidos.
  await page.getByTestId("product-submit").click();
  await expect(page.getByText("El SKU debe tener de 3 a 20 caracteres")).toBeVisible();

  await page.getByLabel("SKU").fill("e2e-001");
  await page.getByLabel("Nombre").fill("Producto E2E");
  await page.getByLabel("Categoría", { exact: true }).selectOption("HOME");
  await page.getByLabel("Precio de venta").fill("19.99");
  await page.getByLabel("Costo unitario").fill("8.50");
  await page.getByLabel("Stock").fill("12");
  await page.getByTestId("product-submit").click();

  await expect(page.getByText("Producto E2E-001 creado")).toBeVisible();
  const row = page.getByTestId("product-row-E2E-001");
  await expect(row).toBeVisible();
  await expect(row).toContainText("Producto E2E");
  await expect(row).toContainText("19,99");

  await page.reload();
  await expect(page.getByTestId("product-row-E2E-001")).toBeVisible();
});

test("crear un pedido lo muestra en la tabla de pedidos y en el Kanban", async ({
  page,
  request,
}) => {
  await page.goto("/orders/new");
  await page.getByLabel("Cliente").selectOption({ index: 1 });
  await page.getByLabel("Producto 1", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Cantidad").fill("2");
  await page.getByTestId("order-submit").click();

  await expect(page.getByText(/Pedido OM-0301 creado/)).toBeVisible();
  await expect(page).toHaveURL(/\/orders\?created=OM-0301/);
  await expect(page.getByTestId("order-row-OM-0301")).toBeVisible();
  await expect(page.getByTestId("order-row-OM-0301")).toContainText("Pendiente");

  const status = await kanbanStatus(request, "OM-0301");
  expect(status.status).toBe("PENDING");
  // Entra al final de la columna Pendiente (45 pedidos de la semilla delante).
  expect(status.position).toBe(45);
});
