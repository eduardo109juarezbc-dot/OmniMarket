import { customerQuerySchema } from "@/lib/schemas";
import { readQuery } from "@/server/errors";
import { json } from "@/server/http";
import { privateRoute } from "@/server/route";
import { listCustomers } from "@/server/services/customers";

/** GET /api/customers?q — opciones del selector de cliente (sin emails). */
export const GET = privateRoute("api/customers", async ({ request, db }) => {
  return json(
    await listCustomers(db, readQuery(request.nextUrl.searchParams, customerQuerySchema)),
  );
});
