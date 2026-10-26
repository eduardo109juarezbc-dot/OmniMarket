import { dashboardQuerySchema } from "@/lib/schemas";
import { readQuery } from "@/server/errors";
import { json } from "@/server/http";
import { privateRoute } from "@/server/route";
import { getDashboard } from "@/server/services/analytics";

/** GET /api/analytics?range=30d|90d|all — KPIs y serie diaria del dashboard (Requisito 9). */
export const GET = privateRoute("api/analytics", async ({ request, db }) => {
  const { range } = readQuery(request.nextUrl.searchParams, dashboardQuerySchema);
  return json(await getDashboard(db, range));
});
