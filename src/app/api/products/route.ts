import { productCreateSchema, productListQuerySchema } from "@/lib/schemas";
import { readJson, readQuery } from "@/server/errors";
import { json } from "@/server/http";
import { privateRoute } from "@/server/route";
import { createProduct, listProducts } from "@/server/services/products";

/** GET /api/products?page&limit&q&category&active — listado paginado (Requisito 10.1). */
export const GET = privateRoute("api/products", async ({ request, db }) => {
  return json(
    await listProducts(db, readQuery(request.nextUrl.searchParams, productListQuerySchema)),
  );
});

/** POST /api/products — alta de producto (Requisito 10.2). */
export const POST = privateRoute("api/products", async ({ request, db }) => {
  const input = await readJson(request, productCreateSchema);
  return json(await createProduct(db, input), { status: 201 });
});
