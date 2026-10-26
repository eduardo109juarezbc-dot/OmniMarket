import { moveOrderSchema } from "@/lib/schemas";
import { readJson } from "@/server/errors";
import { json } from "@/server/http";
import { parseId, privateRoute } from "@/server/route";
import { moveOrder } from "@/server/services/kanban";

/** PATCH /api/orders/:id/move { toStatus, toIndex } — movimiento en el Kanban (Requisito 11). */
export const PATCH = privateRoute<{ id: string }>(
  "api/orders/[id]/move",
  async ({ request, params, db }) => {
    const id = parseId(params.id);
    const input = await readJson(request, moveOrderSchema);
    return json(await moveOrder(db, id, input));
  },
);
