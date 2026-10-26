/**
 * Integración de los Route Handlers de /api/test/* con la base simulada:
 * validación, códigos de estado, cabeceras y forma de la respuesta.
 */
import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSalesAnalytics: vi.fn(),
  resetDatabase: vi.fn(),
  getOrderKanbanStatus: vi.fn(),
  getBoardSummary: vi.fn(),
}));

vi.mock("@/server/db/client", () => ({ getDb: () => ({}) }));
vi.mock("@/server/services/analytics", () => ({ getSalesAnalytics: mocks.getSalesAnalytics }));
vi.mock("@/server/services/reset", () => ({ resetDatabase: mocks.resetDatabase }));
vi.mock("@/server/services/kanban-status", () => ({
  getOrderKanbanStatus: mocks.getOrderKanbanStatus,
  getBoardSummary: mocks.getBoardSummary,
}));

const TOKEN = "token-de-prueba-0123456789";

async function loadRoutes() {
  // serverEnv() se cachea por módulo: se recargan los módulos tras cambiar el entorno.
  vi.resetModules();
  return {
    analytics: await import("@/app/api/test/analytics/route"),
    reset: await import("@/app/api/test/reset-data/route"),
    kanban: await import("@/app/api/test/kanban-status/route"),
  };
}

const request = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(new URL(path, "http://localhost"), init);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@localhost:5432/db");
  vi.stubEnv("TEST_API_TOKEN", TOKEN);
});

describe("GET /api/test/analytics", () => {
  it("valida page/limit, pagina con valores por defecto y expone Server-Timing", async () => {
    const { analytics } = await loadRoutes();
    mocks.getSalesAnalytics.mockResolvedValue({
      summary: { totalOrders: 279 },
      data: [],
      meta: { page: 2, limit: 10, total: 300, totalPages: 30 },
    });

    const invalid = await analytics.GET(request("/api/test/analytics?limit=500"));
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error.code).toBe("VALIDATION_ERROR");
    expect(mocks.getSalesAnalytics).not.toHaveBeenCalled();

    const ok = await analytics.GET(request("/api/test/analytics?page=2&limit=10"));
    expect(ok.status).toBe(200);
    expect(mocks.getSalesAnalytics).toHaveBeenCalledWith({}, { page: 2, limit: 10 });
    expect(ok.headers.get("server-timing")).toMatch(/^app;dur=\d+(\.\d+)?$/);
    expect(ok.headers.get("cache-control")).toBe("no-store");
    const body = await ok.json();
    expect(body.meta).toMatchObject({ page: 2, limit: 10, total: 300, totalPages: 30 });
    expect(typeof body.meta.durationMs).toBe("number");

    await analytics.GET(request("/api/test/analytics"));
    expect(mocks.getSalesAnalytics).toHaveBeenLastCalledWith({}, { page: 1, limit: 50 });
  });

  it("responde 500 sin detalles internos si falla la base", async () => {
    const { analytics } = await loadRoutes();
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getSalesAnalytics.mockRejectedValue(new Error("password authentication failed"));
    const res = await analytics.GET(request("/api/test/analytics"));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("password");
  });
});

describe("POST /api/test/reset-data", () => {
  it("exige el token, responde 503 si está deshabilitado y restablece con token válido", async () => {
    let { reset } = await loadRoutes();
    mocks.resetDatabase.mockResolvedValue({
      seed: 20261025,
      counts: { products: 40, customers: 60, orders: 300, orderItems: 738 },
    });

    const missing = await reset.POST(request("/api/test/reset-data", { method: "POST" }));
    expect(missing.status).toBe(401);

    const wrong = await reset.POST(
      request("/api/test/reset-data", { method: "POST", headers: { "x-test-token": "otro" } }),
    );
    expect(wrong.status).toBe(401);
    expect(mocks.resetDatabase).not.toHaveBeenCalled();

    const ok = await reset.POST(
      request("/api/test/reset-data", { method: "POST", headers: { "x-test-token": TOKEN } }),
    );
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, seed: 20261025, counts: { orders: 300 } });
    expect(mocks.resetDatabase).toHaveBeenCalledTimes(1);

    vi.stubEnv("TEST_API_TOKEN", "");
    ({ reset } = await loadRoutes());
    const disabled = await reset.POST(
      request("/api/test/reset-data", { method: "POST", headers: { "x-test-token": TOKEN } }),
    );
    expect(disabled.status).toBe(503);
    expect((await disabled.json()).error.code).toBe("TEST_API_DISABLED");
  });
});

describe("GET /api/test/kanban-status", () => {
  it("devuelve el resumen sin parámetros, el estado por código y 400/404 cuando toca", async () => {
    const { kanban } = await loadRoutes();
    mocks.getBoardSummary.mockResolvedValue({
      columns: [{ status: "PENDING", label: "Pendiente", count: 45 }],
    });
    mocks.getOrderKanbanStatus.mockImplementation(async (_db, query: { code?: string }) =>
      query.code === "OM-0001"
        ? { code: "OM-0001", status: "PROCESSING", columnLabel: "En proceso", position: 0 }
        : null,
    );

    const summary = await kanban.GET(request("/api/test/kanban-status"));
    expect(summary.status).toBe(200);
    expect((await summary.json()).columns[0].count).toBe(45);

    const found = await kanban.GET(request("/api/test/kanban-status?code=om-0001"));
    expect(found.status).toBe(200);
    expect(await found.json()).toMatchObject({ status: "PROCESSING", columnLabel: "En proceso" });

    const missing = await kanban.GET(request("/api/test/kanban-status?code=OM-9999"));
    expect(missing.status).toBe(404);

    const badUuid = await kanban.GET(request("/api/test/kanban-status?orderId=123"));
    expect(badUuid.status).toBe(400);

    const both = await kanban.GET(
      request(`/api/test/kanban-status?orderId=${randomUUID()}&code=OM-0001`),
    );
    expect(both.status).toBe(400);
  });
});
