import { z } from "zod";
import { ORDER_CODE_PATTERN } from "../domain";
import { idSchema, paginationQuerySchema } from "./common";

/** GET /api/test/analytics?page=1&limit=50 (Requisito 5.1). */
export const analyticsQuerySchema = paginationQuerySchema(50);

/**
 * GET /api/test/kanban-status?orderId=<uuid> | ?code=OM-0001 (Requisito 7).
 * Sin parámetros devuelve el resumen por columna.
 */
export const kanbanStatusQuerySchema = z
  .object({
    orderId: idSchema.optional(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(ORDER_CODE_PATTERN, { error: "code debe tener el formato OM-0001" })
      .optional(),
  })
  .refine((query) => !(query.orderId && query.code), {
    error: "Usa orderId o code, no ambos",
  });

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type KanbanStatusQuery = z.infer<typeof kanbanStatusQuerySchema>;
