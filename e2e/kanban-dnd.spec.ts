/**
 * Flujo E2E 3 — Drag and drop (PDF §5): arrastre de una tarjeta del Kanban y
 * aserción del cambio de columna, en la UI y en GET /api/test/kanban-status.
 */
import { STORAGE_STATE } from "./env";
import { dragTo, expect, kanbanStatus, test } from "./fixtures";

test.use({ storageState: STORAGE_STATE });

test("arrastrar OM-0001 a En proceso cambia su columna y persiste", async ({ page, request }) => {
  await page.goto("/kanban");
  const pending = page.getByTestId("kanban-column-PENDING");
  const processing = page.getByTestId("kanban-column-PROCESSING");
  await expect(pending.getByTestId("kanban-card-OM-0001")).toBeVisible();
  expect((await kanbanStatus(request, "OM-0001")).status).toBe("PENDING");

  await dragTo(page, page.getByTestId("kanban-card-OM-0001"), processing);

  await expect(processing.getByTestId("kanban-card-OM-0001")).toBeVisible();
  await expect(pending.getByTestId("kanban-card-OM-0001")).toHaveCount(0);
  await expect(page.getByText('OM-0001 movido a "En proceso"')).toBeVisible();

  await expect.poll(async () => (await kanbanStatus(request, "OM-0001")).status).toBe("PROCESSING");
  expect((await kanbanStatus(request, "OM-0001")).columnLabel).toBe("En proceso");

  await page.reload();
  await expect(processing.getByTestId("kanban-card-OM-0001")).toBeVisible();
});

test.describe("si el servidor falla", () => {
  // Chrome registra la respuesta 500 simulada en la consola.
  test.use({ allowedConsole: [/status of 500/] });

  test("la tarjeta vuelve a su columna y se avisa con un toast", async ({ page, request }) => {
    await page.route("**/api/orders/*/move", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Error simulado" } }),
      }),
    );
    await page.goto("/kanban");
    await dragTo(
      page,
      page.getByTestId("kanban-card-OM-0001"),
      page.getByTestId("kanban-column-SHIPPED"),
    );

    await expect(
      page.getByText(/No se pudo mover OM-0001\. Se restauró su posición/),
    ).toBeVisible();
    await expect(
      page.getByTestId("kanban-column-PENDING").getByTestId("kanban-card-OM-0001"),
    ).toBeVisible();
    expect((await kanbanStatus(request, "OM-0001")).status).toBe("PENDING");
  });
});
