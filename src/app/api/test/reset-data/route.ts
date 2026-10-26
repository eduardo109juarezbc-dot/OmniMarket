import type { NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { serverEnv } from "@/server/env";
import { internalError, json, problem, withTiming } from "@/server/http";
import { safeEqual, TEST_TOKEN_HEADER } from "@/server/security";
import { resetDatabase } from "@/server/services/reset";

/**
 * POST /api/test/reset-data — endpoint de auditoría (PDF §2, Requisito 6).
 * Restablece las tablas de negocio al conjunto semilla en una transacción.
 * Destructivo: exige la cabecera x-test-token igual a TEST_API_TOKEN.
 */
export async function POST(request: NextRequest) {
  return withTiming(async (elapsedMs) => {
    const expected = serverEnv().TEST_API_TOKEN;
    if (!expected) {
      return problem(503, "TEST_API_DISABLED", "El restablecimiento de datos está deshabilitado");
    }

    const provided = request.headers.get(TEST_TOKEN_HEADER) ?? "";
    if (!provided || !safeEqual(provided, expected)) {
      return problem(401, "UNAUTHORIZED", `Cabecera ${TEST_TOKEN_HEADER} ausente o no válida`);
    }

    try {
      const { seed, counts } = await resetDatabase(getDb());
      return json({ ok: true, seed, counts, durationMs: elapsedMs() });
    } catch (error) {
      return internalError(error, "api/test/reset-data");
    }
  }, "reset");
}
