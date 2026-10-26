import type { NextRequest } from "next/server";
import { kanbanStatusQuerySchema } from "@/lib/schemas";
import { getDb } from "@/server/db/client";
import { internalError, json, problem, validationProblem, withTiming } from "@/server/http";
import { getBoardSummary, getOrderKanbanStatus } from "@/server/services/kanban-status";

/**
 * GET /api/test/kanban-status — endpoint de auditoría (PDF §2, Requisito 7).
 * - ?orderId=<uuid> o ?code=OM-0001: estado, columna y posición del pedido.
 * - sin parámetros: número de pedidos por columna.
 * Público y de solo lectura; lee siempre de la base, sin caché.
 */
export async function GET(request: NextRequest) {
  return withTiming(async () => {
    const parsed = kanbanStatusQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) return validationProblem(parsed.error);
    const { orderId, code } = parsed.data;

    try {
      const db = getDb();
      if (!orderId && !code) return json(await getBoardSummary(db));

      const status = await getOrderKanbanStatus(
        db,
        orderId ? { orderId } : { code: code as string },
      );
      if (!status) return problem(404, "NOT_FOUND", "Pedido no encontrado");
      return json(status);
    } catch (error) {
      return internalError(error, "api/test/kanban-status");
    }
  });
}
