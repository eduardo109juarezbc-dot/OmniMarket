import { json } from "@/server/http";
import { privateRoute } from "@/server/route";
import { getBoard } from "@/server/services/orders";

/** GET /api/orders/board — pedidos agrupados por columna del Kanban (Requisito 11.1). */
export const GET = privateRoute("api/orders/board", async ({ db }) => json(await getBoard(db)));
