import { orderCreateSchema, orderListQuerySchema } from "@/lib/schemas";
import { readJson, readQuery } from "@/server/errors";
import { json } from "@/server/http";
import { privateRoute } from "@/server/route";
import { createOrder, listOrders } from "@/server/services/orders";

/** GET /api/orders?page&limit&status&q&from&to — listado paginado (Requisito 10.5). */
export const GET = privateRoute("api/orders", async ({ request, db }) => {
  return json(await listOrders(db, readQuery(request.nextUrl.searchParams, orderListQuerySchema)));
});

/** POST /api/orders — alta de pedido; el total lo calcula el servidor (Requisito 10.6). */
export const POST = privateRoute("api/orders", async ({ request, db }) => {
  const input = await readJson(request, orderCreateSchema);
  return json(await createOrder(db, input), { status: 201 });
});
