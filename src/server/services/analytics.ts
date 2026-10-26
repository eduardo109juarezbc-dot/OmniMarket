import "server-only";
import { asc, desc, gte, sql, type SQL } from "drizzle-orm";
import type { DashboardDto, DashboardRange, SalesPageDto, SalesSummaryDto } from "@/lib/api-types";
import { appConfig } from "@/lib/config";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/domain";
import { buildSalesSummary, grossMargin, marginPct } from "@/lib/finance";
import { pageMeta, pageOffset } from "@/lib/filters";
import { fromCents } from "@/lib/format";
import type { AnalyticsQuery } from "@/lib/schemas";
import type { Db } from "../db/client";
import { orders } from "../db/schema";

export type SalesAnalytics = SalesPageDto;

const notCancelled = sql`${orders.status} <> 'CANCELLED'`;

/**
 * Resumen de ventas con una sola consulta de agregados condicionales sobre
 * `orders` (totales desnormalizados, sin JOIN). Los pedidos CANCELLED cuentan
 * en el desglose por estado pero no en ingresos, costo ni ticket (Requisito 5.3).
 */
async function querySummary(
  db: Db,
  where?: SQL,
): Promise<{ summary: SalesSummaryDto; totalRows: number }> {
  const statusCounts = Object.fromEntries(
    ORDER_STATUSES.map((status) => [
      status,
      sql<number>`count(*) filter (where ${orders.status} = ${status})`.mapWith(Number),
    ]),
  ) as Record<OrderStatus, SQL.Aliased<number> | ReturnType<typeof sql<number>>>;

  const [row] = await db
    .select({
      revenueCents:
        sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${notCancelled}), 0)`.mapWith(
          Number,
        ),
      costCents:
        sql<number>`coalesce(sum(${orders.costCents}) filter (where ${notCancelled}), 0)`.mapWith(
          Number,
        ),
      salesCount: sql<number>`count(*) filter (where ${notCancelled})`.mapWith(Number),
      totalRows: sql<number>`count(*)`.mapWith(Number),
      ...statusCounts,
    })
    .from(orders)
    .where(where);

  const record = (row ?? {}) as Record<string, number | undefined>;
  const ordersByStatus = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, Number(record[status] ?? 0)]),
  ) as Record<OrderStatus, number>;

  const summary = buildSalesSummary({
    revenueCents: Number(record.revenueCents ?? 0),
    costCents: Number(record.costCents ?? 0),
    orderCount: Number(record.salesCount ?? 0),
    ordersByStatus,
  });

  return {
    totalRows: Number(record.totalRows ?? 0),
    summary: {
      currency: appConfig.currency,
      totalRevenue: fromCents(summary.revenueCents),
      totalOrders: summary.orderCount,
      averageTicket: fromCents(summary.averageTicketCents),
      grossMargin: fromCents(summary.grossMarginCents),
      marginPct: summary.marginPct,
      ordersByStatus: summary.ordersByStatus,
    },
  };
}

/**
 * Métricas de ventas paginadas para GET /api/test/analytics (Requisitos 5 y 8).
 * Dos consultas en paralelo: el resumen y la página pedida, ordenada por el
 * índice (created_at DESC, code). Sin datos personales de clientes (Requisito 5.8).
 */
export async function getSalesAnalytics(
  db: Db,
  { page, limit }: AnalyticsQuery,
): Promise<SalesAnalytics> {
  const [{ summary, totalRows }, rows] = await Promise.all([
    querySummary(db),
    db
      .select({
        id: orders.id,
        code: orders.code,
        createdAt: orders.createdAt,
        status: orders.status,
        itemsCount: orders.itemsCount,
        totalCents: orders.totalCents,
        costCents: orders.costCents,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt), asc(orders.code))
      .limit(limit)
      .offset(pageOffset(page, limit)),
  ]);

  return {
    summary,
    data: rows.map((row) => ({
      orderId: row.id,
      code: row.code,
      createdAt: row.createdAt.toISOString(),
      status: row.status,
      itemsCount: row.itemsCount,
      revenue: fromCents(row.totalCents),
      cost: fromCents(row.costCents),
      margin: fromCents(grossMargin(row.totalCents, row.costCents)),
      marginPct: marginPct(row.totalCents, row.costCents),
    })),
    meta: pageMeta(totalRows, page, limit),
  };
}

const RANGE_DAYS: Record<DashboardRange, number | null> = { "30d": 30, "90d": 90, all: null };

/**
 * KPIs y serie diaria para el dashboard (GET /api/analytics, Requisito 9).
 * El rango se cuenta hacia atrás desde el pedido más reciente, no desde hoy:
 * así el conjunto semilla (fechas fijas) siempre muestra datos.
 */
export async function getDashboard(db: Db, range: DashboardRange): Promise<DashboardDto> {
  const days = RANGE_DAYS[range];
  const since =
    days === null
      ? undefined
      : sql`(select max(${orders.createdAt}) from ${orders}) - make_interval(days => ${days})`;
  const where = since ? gte(orders.createdAt, since) : undefined;

  const day = sql<string>`to_char(date_trunc('day', ${orders.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`;

  const [{ summary }, daily] = await Promise.all([
    querySummary(db, where),
    db
      .select({
        date: day,
        revenueCents:
          sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${notCancelled}), 0)`.mapWith(
            Number,
          ),
        orders: sql<number>`count(*) filter (where ${notCancelled})`.mapWith(Number),
      })
      .from(orders)
      .where(where)
      .groupBy(day)
      .orderBy(day),
  ]);

  return {
    range,
    summary,
    daily: daily.map((row) => ({
      date: row.date,
      revenue: fromCents(row.revenueCents),
      orders: row.orders,
    })),
    generatedAt: new Date().toISOString(),
  };
}
