import "server-only";
import { sql } from "drizzle-orm";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/domain";
import { statusLabel } from "@/lib/kanban";
import type { KanbanStatusQuery } from "@/lib/schemas";
import type { Db } from "../db/client";
import { orders } from "../db/schema";

export type OrderKanbanStatus = {
  orderId: string;
  code: string;
  status: OrderStatus;
  columnLabel: string;
  /** Índice dentro de la columna, desde 0 (orden visible en el tablero). */
  position: number;
  updatedAt: string;
};

export type BoardSummary = {
  columns: { status: OrderStatus; label: string; count: number }[];
};

/**
 * Estado actual de un pedido para GET /api/test/kanban-status (Requisito 7).
 * Lee siempre de la base (sin caché) para reflejar el último movimiento.
 * El índice se calcula contando los pedidos anteriores de la misma columna,
 * lo que aprovecha el índice (status, position).
 */
export async function getOrderKanbanStatus(
  db: Db,
  query: Required<Pick<KanbanStatusQuery, "orderId">> | Required<Pick<KanbanStatusQuery, "code">>,
): Promise<OrderKanbanStatus | null> {
  // SQL explícito con alias `o` / `o2`: con el query builder, Drizzle no califica
  // las columnas exteriores dentro de la subconsulta y se comparaban consigo mismas.
  const match = "orderId" in query ? sql`o.id = ${query.orderId}` : sql`o.code = ${query.code}`;
  const rows = await db.execute<{
    id: string;
    code: string;
    status: OrderStatus;
    updated_at: Date | string;
    index: number;
  }>(sql`
    select o.id, o.code, o.status, o.updated_at,
      (select count(*)::int from orders o2
        where o2.status = o.status
          and (o2.position < o.position or (o2.position = o.position and o2.id < o.id))) as index
    from orders o
    where ${match}
    limit 1
  `);

  const row = rows[0];
  if (!row) return null;
  return {
    orderId: row.id,
    code: row.code,
    status: row.status,
    columnLabel: statusLabel(row.status),
    position: Number(row.index),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/** Sin parámetros: número de pedidos por columna, en el orden del tablero. */
export async function getBoardSummary(db: Db): Promise<BoardSummary> {
  const rows = await db
    .select({ status: orders.status, count: sql<number>`count(*)`.mapWith(Number) })
    .from(orders)
    .groupBy(orders.status);

  // Tipos explícitos: sin ellos, algunas versiones de TypeScript infieren el
  // Map como Map<…, {}> a partir de la tupla y `count` deja de ser number.
  const counts = new Map<OrderStatus, number>(
    rows.map((row): [OrderStatus, number] => [row.status, Number(row.count)]),
  );
  return {
    columns: ORDER_STATUSES.map((status) => ({
      status,
      label: statusLabel(status),
      count: counts.get(status) ?? 0,
    })),
  };
}
