import { analyticsQuerySchema } from "@/lib/schemas";
import { readQuery } from "@/server/errors";
import { json } from "@/server/http";
import { privateRoute } from "@/server/route";
import { getSalesAnalytics } from "@/server/services/analytics";

/** GET /api/analytics/sales?page&limit — tabla de ventas del dashboard (Requisito 9.3). */
export const GET = privateRoute("api/analytics/sales", async ({ request, db }) => {
  return json(
    await getSalesAnalytics(db, readQuery(request.nextUrl.searchParams, analyticsQuerySchema)),
  );
});
