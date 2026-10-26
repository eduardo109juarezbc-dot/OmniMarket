import { productUpdateSchema } from "@/lib/schemas";
import { readJson } from "@/server/errors";
import { json } from "@/server/http";
import { parseId, privateRoute } from "@/server/route";
import { deleteProduct, updateProduct } from "@/server/services/products";

type Params = { id: string };

/** PATCH /api/products/:id — edición parcial (Requisito 10.3). */
export const PATCH = privateRoute<Params>("api/products/[id]", async ({ request, params, db }) => {
  const id = parseId(params.id);
  const patch = await readJson(request, productUpdateSchema);
  return json(await updateProduct(db, id, patch));
});

/** DELETE /api/products/:id — 204, o 409 PRODUCT_IN_USE si tiene ventas (Requisito 10.4). */
export const DELETE = privateRoute<Params>("api/products/[id]", async ({ params, db }) => {
  await deleteProduct(db, parseId(params.id));
  return new Response(null, { status: 204 });
});
