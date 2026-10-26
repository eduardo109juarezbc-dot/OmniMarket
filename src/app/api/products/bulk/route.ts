import { bulkProductSchema } from "@/lib/schemas";
import { readJson } from "@/server/errors";
import { json } from "@/server/http";
import { privateRoute } from "@/server/route";
import { bulkUpdateProducts } from "@/server/services/bulk";

/** PATCH /api/products/bulk { ids[1..100], patch: { active?, category? } } (Requisito 12.3). */
export const PATCH = privateRoute("api/products/bulk", async ({ request, db }) => {
  return json(await bulkUpdateProducts(db, await readJson(request, bulkProductSchema)));
});
