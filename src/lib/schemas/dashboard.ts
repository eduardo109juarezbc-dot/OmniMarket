import { z } from "zod";
import { searchTextSchema } from "./common";

export const DASHBOARD_RANGES = ["30d", "90d", "all"] as const;

/** GET /api/analytics?range=30d|90d|all. Por defecto todo el histórico. */
export const dashboardQuerySchema = z.object({
  range: z.enum(DASHBOARD_RANGES, { error: "range debe ser 30d, 90d o all" }).default("all"),
});

/** GET /api/customers?q=… (selector del formulario de pedido). */
export const customerQuerySchema = z.object({ q: searchTextSchema });

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type CustomerQuery = z.infer<typeof customerQuerySchema>;
