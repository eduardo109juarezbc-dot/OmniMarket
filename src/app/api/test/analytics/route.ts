import type { NextRequest } from "next/server";
import { analyticsQuerySchema } from "@/lib/schemas";
import { getDb } from "@/server/db/client";
import { internalError, json, validationProblem, withTiming } from "@/server/http";
import { getSalesAnalytics } from "@/server/services/analytics";

/**
 * GET /api/test/analytics?page=1&limit=50 — endpoint de auditoría (PDF §2).
 * Métricas de ventas paginadas, SLA < 300 ms. Público y de solo lectura, sin
 * datos personales. La duración va en `Server-Timing` y en `meta.durationMs`.
 */
export async function GET(request: NextRequest) {
  return withTiming(async (elapsedMs) => {
    const parsed = analyticsQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) return validationProblem(parsed.error);

    try {
      const result = await getSalesAnalytics(getDb(), parsed.data);
      return json({ ...result, meta: { ...result.meta, durationMs: elapsedMs() } });
    } catch (error) {
      return internalError(error, "api/test/analytics");
    }
  });
}
