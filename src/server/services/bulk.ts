import "server-only";
import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import type { BulkResultDto } from "@/lib/api-types";
import { POSITION_STEP } from "@/lib/kanban";
import type { BulkOrderInput, BulkProductInput } from "@/lib/schemas";
import type { Db } from "../db/client";
import { orders, products } from "../db/schema";
import { DomainError } from "../errors";

const missingRecords = (missing: number, noun: string) =>
  new DomainError(
    404,
    "NOT_FOUND",
    `${missing} ${noun} de la selección no existen; no se aplicó ningún cambio`,
  );

/**
 * Cambio de estado en lote (Requisito 12.2), en una sola transacción:
 * si algún id no existe, se revierte todo (404). Los pedidos que cambian de
 * columna se colocan al final de la columna destino, en el orden recibido;
 * los que ya estaban en ese estado conservan su posición.
 */
export async function bulkUpdateOrders(
  db: Db,
  { ids, status }: BulkOrderInput,
): Promise<BulkResultDto> {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(inArray(orders.id, ids))
      .for("update");
    if (rows.length !== ids.length) throw missingRecords(ids.length - rows.length, "pedidos");

    const byId = new Map(rows.map((row) => [row.id, row]));
    const moving = ids.filter((id) => byId.get(id)?.status !== status);
    if (moving.length === 0) return { updated: ids.length };

    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`kanban:${status}`}))`);
    const [last] = await tx
      .select({ position: sql<number | null>`max(${orders.position})` })
      .from(orders)
      .where(and(eq(orders.status, status), notInArray(orders.id, moving)));
    const start = (last?.position ?? 0) + POSITION_STEP;

    const values = sql.join(
      moving.map((id, i) => sql`(${id}::uuid, ${start + i * POSITION_STEP}::float8)`),
      sql`, `,
    );
    await tx.execute(sql`
      update orders as o
      set status = ${status}::order_status, position = v.position, updated_at = now()
      from (values ${values}) as v(id, position)
      where o.id = v.id
    `);

    return { updated: ids.length };
  });
}

/** Activar/desactivar o cambiar la categoría de varios productos (Requisito 12.3). */
export async function bulkUpdateProducts(
  db: Db,
  { ids, patch }: BulkProductInput,
): Promise<BulkResultDto> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(products)
      .set({
        ...(patch.active === undefined ? {} : { active: patch.active }),
        ...(patch.category === undefined ? {} : { category: patch.category }),
        updatedAt: new Date(),
      })
      .where(inArray(products.id, ids))
      .returning({ id: products.id });
    // Lanzar dentro de la transacción revierte también las filas ya actualizadas.
    if (updated.length !== ids.length)
      throw missingRecords(ids.length - updated.length, "productos");
    return { updated: updated.length };
  });
}
