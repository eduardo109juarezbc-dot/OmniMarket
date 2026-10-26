import "server-only";
import { and, asc, eq, ne, sql } from "drizzle-orm";
import type { MoveResultDto } from "@/lib/api-types";
import { needsRebalance, neighborsAt, positionBetween, rebalancedPositions } from "@/lib/kanban";
import type { MoveOrderInput } from "@/lib/schemas";
import type { Db } from "../db/client";
import { orders } from "../db/schema";
import { notFound } from "../errors";

/**
 * Mueve un pedido a `toStatus` en el índice `toIndex` de la columna, contado
 * sin el propio pedido (misma semántica que `applyMove` en el cliente, así la
 * posición optimista y la persistida coinciden). Requisitos 11.4 y 11.8.
 *
 * En una transacción:
 * 1. bloquea el pedido (FOR UPDATE) y la columna destino (advisory lock), para
 *    que dos movimientos simultáneos no calculen la misma posición;
 * 2. calcula la posición fraccional entre los vecinos;
 * 3. si los vecinos están demasiado juntos, renumera la columna (1000, 2000…).
 */
export async function moveOrder(
  db: Db,
  id: string,
  { toStatus, toIndex }: MoveOrderInput,
): Promise<MoveResultDto> {
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");
    if (!current) throw notFound("Pedido no encontrado");

    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`kanban:${toStatus}`}))`);

    const column = await tx
      .select({ id: orders.id, position: orders.position })
      .from(orders)
      .where(and(eq(orders.status, toStatus), ne(orders.id, id)))
      .orderBy(asc(orders.position), asc(orders.id));

    const { prev, next, index } = neighborsAt(
      column.map((row) => row.position),
      toIndex,
    );

    let position: number;
    if (needsRebalance(prev, next)) {
      const ordered = column.map((row) => row.id);
      ordered.splice(index, 0, id);
      const positions = rebalancedPositions(ordered.length);
      const values = sql.join(
        ordered.map((rowId, i) => sql`(${rowId}::uuid, ${positions[i]}::float8)`),
        sql`, `,
      );
      await tx.execute(sql`
        update orders as o set position = v.position
        from (values ${values}) as v(id, position)
        where o.id = v.id and o.id <> ${id}
      `);
      position = positions[index] as number;
    } else {
      position = positionBetween(prev, next);
    }

    const [moved] = await tx
      .update(orders)
      .set({ status: toStatus, position, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning({
        id: orders.id,
        status: orders.status,
        position: orders.position,
        updatedAt: orders.updatedAt,
      });
    if (!moved) throw notFound("Pedido no encontrado");

    return { ...moved, updatedAt: moved.updatedAt.toISOString() };
  });
}
