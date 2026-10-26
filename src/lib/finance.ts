import { ORDER_STATUSES, type OrderStatus } from "./domain";

/**
 * Cálculos financieros. Todos los importes se expresan en céntimos (enteros)
 * para evitar errores de coma flotante; solo los porcentajes son decimales.
 */

/** Redondea a 2 decimales (para porcentajes). */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Ticket promedio: ingresos / número de pedidos, redondeado al céntimo.
 * Devuelve 0 si no hay pedidos (nunca NaN ni Infinity).
 */
export function averageTicket(revenueCents: number, orderCount: number): number {
  if (orderCount <= 0) return 0;
  return Math.round(revenueCents / orderCount);
}

/** Margen bruto en céntimos: ingresos − costo de la mercancía vendida. */
export function grossMargin(revenueCents: number, costCents: number): number {
  return revenueCents - costCents;
}

/**
 * Porcentaje de margen bruto sobre ingresos (0–100, con 2 decimales).
 * Devuelve 0 si no hay ingresos.
 */
export function marginPct(revenueCents: number, costCents: number): number {
  if (revenueCents <= 0) return 0;
  return round2((grossMargin(revenueCents, costCents) / revenueCents) * 100);
}

export type LineItem = {
  quantity: number;
  unitPriceCents: number;
  unitCostCents: number;
};

export type OrderTotals = {
  totalCents: number;
  costCents: number;
  itemsCount: number;
};

/** Totales de un pedido a partir de sus líneas (precios y costos congelados). */
export function orderTotals(items: readonly LineItem[]): OrderTotals {
  return items.reduce<OrderTotals>(
    (acc, item) => ({
      totalCents: acc.totalCents + item.quantity * item.unitPriceCents,
      costCents: acc.costCents + item.quantity * item.unitCostCents,
      itemsCount: acc.itemsCount + item.quantity,
    }),
    { totalCents: 0, costCents: 0, itemsCount: 0 },
  );
}

export type OrderForSummary = {
  status: OrderStatus;
  totalCents: number;
  costCents: number;
};

export type SalesSummary = {
  revenueCents: number;
  costCents: number;
  /** Pedidos que cuentan como venta (excluye CANCELLED). */
  orderCount: number;
  averageTicketCents: number;
  grossMarginCents: number;
  marginPct: number;
  /** Conteo de todos los pedidos, incluidos los cancelados. */
  ordersByStatus: Record<OrderStatus, number>;
};

export function emptyStatusCount(): Record<OrderStatus, number> {
  return Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<
    OrderStatus,
    number
  >;
}

/**
 * Resumen de ventas a partir de totales ya agregados. Lo usa el servicio de
 * analítica con los agregados que devuelve Postgres.
 */
export function buildSalesSummary(input: {
  revenueCents: number;
  costCents: number;
  orderCount: number;
  ordersByStatus: Record<OrderStatus, number>;
}): SalesSummary {
  return {
    revenueCents: input.revenueCents,
    costCents: input.costCents,
    orderCount: input.orderCount,
    averageTicketCents: averageTicket(input.revenueCents, input.orderCount),
    grossMarginCents: grossMargin(input.revenueCents, input.costCents),
    marginPct: marginPct(input.revenueCents, input.costCents),
    ordersByStatus: input.ordersByStatus,
  };
}

/**
 * Resumen de ventas a partir de una lista de pedidos. Los pedidos CANCELLED
 * cuentan en `ordersByStatus` pero no en ingresos, costo ni ticket promedio.
 */
export function summarizeOrders(orders: readonly OrderForSummary[]): SalesSummary {
  const ordersByStatus = emptyStatusCount();
  let revenueCents = 0;
  let costCents = 0;
  let orderCount = 0;

  for (const order of orders) {
    ordersByStatus[order.status] += 1;
    if (order.status === "CANCELLED") continue;
    revenueCents += order.totalCents;
    costCents += order.costCents;
    orderCount += 1;
  }

  return buildSalesSummary({ revenueCents, costCents, orderCount, ordersByStatus });
}
