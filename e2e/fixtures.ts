/**
 * Fixtures comunes de los E2E:
 * - antes de cada test, POST /api/test/reset-data (Requisito 15.4);
 * - cualquier console.error, aviso o error de página no previsto hace fallar el
 *   test (Requisito 15.5 y criterio "renderizado sin errores de consola").
 */
import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";
import { E2E_TEST_API_TOKEN } from "./env";

type Fixtures = {
  /** Mensajes de consola esperados en este test (p. ej. un 500 simulado). */
  allowedConsole: RegExp[];
  resetData: void;
  consoleGuard: void;
};

export async function resetData(request: APIRequestContext) {
  const response = await request.post("/api/test/reset-data", {
    headers: { "x-test-token": E2E_TEST_API_TOKEN },
  });
  expect(response.status(), await response.text()).toBe(200);
}

export const test = base.extend<Fixtures>({
  allowedConsole: [[], { option: true }],

  resetData: [
    async ({ request }, use) => {
      await resetData(request);
      await use();
    },
    { auto: true },
  ],

  consoleGuard: [
    async ({ page, allowedConsole }, use) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() !== "error" && message.type() !== "warning") return;
        const text = message.text();
        if (allowedConsole.some((pattern) => pattern.test(text))) return;
        problems.push(`[console.${message.type()}] ${text}`);
      });
      page.on("pageerror", (error) => problems.push(`[pageerror] ${error.message}`));
      await use();
      expect(problems, "La consola del navegador debe estar limpia").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Estado de un pedido según el endpoint de auditoría. */
export async function kanbanStatus(request: APIRequestContext, code: string) {
  const response = await request.get(`/api/test/kanban-status?code=${code}`);
  expect(response.status()).toBe(200);
  return (await response.json()) as { status: string; columnLabel: string; position: number };
}

/**
 * Arrastre con el ratón en varios pasos: el PointerSensor de dnd-kit solo se
 * activa tras moverse más de 5 px.
 */
export async function dragTo(
  page: Page,
  source: ReturnType<Page["locator"]>,
  target: ReturnType<Page["locator"]>,
) {
  // El tablero llega en streaming (Suspense): se espera a que esté pintado.
  await source.waitFor({ state: "visible" });
  await target.waitFor({ state: "visible" });
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("No se pudo calcular la posición del arrastre");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 20 });
  await page.mouse.up();
}
