import { bulkOrderSchema } from "@/lib/schemas";
import { readJson } from "@/server/errors";
import { json } from "@/server/http";
import { privateRoute } from "@/server/route";
import { bulkUpdateOrders } from "@/server/services/bulk";

/** PATCH /api/orders/bulk { ids[1..100], status } — cambio de estado en lote (Requisito 12.2). */
export const PATCH = privateRoute("api/orders/bulk", async ({ request, db }) => {
  return json(await bulkUpdateOrders(db, await readJson(request, bulkOrderSchema)));
});
