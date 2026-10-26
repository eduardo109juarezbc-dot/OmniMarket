/**
 * Restablecimiento de la base al conjunto semilla (Requisito 6.5–6.8).
 * Lo usan POST /api/test/reset-data y `npm run db:seed`.
 *
 * Imports relativos y sin `server-only`: también se ejecuta desde scripts.
 * El handler HTTP sí importa `server-only`.
 */
import { sql } from "drizzle-orm";
import type { Db } from "../db/create";
import { customers, orderItems, orders, products } from "../db/schema";
import { generateSeed, type SeedData } from "../seed/generate";

const INSERT_CHUNK = 500;

export type ResetCounts = {
  products: number;
  customers: number;
  orders: number;
  orderItems: number;
};

export type ResetResult = { seed: number; counts: ResetCounts };

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

/**
 * Vacía las tablas de negocio y carga la semilla en una única transacción:
 * si algo falla, se revierte y se conservan los datos anteriores. No toca el
 * esquema `auth` de Supabase (los usuarios se mantienen).
 */
export async function resetDatabase(db: Db, data: SeedData = generateSeed()): Promise<ResetResult> {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`truncate table ${orderItems}, ${orders}, ${products}, ${customers} restart identity cascade`,
    );

    for (const chunk of chunks(data.products, INSERT_CHUNK))
      await tx.insert(products).values(chunk);
    for (const chunk of chunks(data.customers, INSERT_CHUNK))
      await tx.insert(customers).values(chunk);
    for (const chunk of chunks(data.orders, INSERT_CHUNK)) await tx.insert(orders).values(chunk);
    for (const chunk of chunks(data.orderItems, INSERT_CHUNK))
      await tx.insert(orderItems).values(chunk);

    // El siguiente pedido creado desde la app recibe el código OM-0301.
    const lastCode = data.orders.length;
    await tx.execute(
      sql`select setval('public.order_code_seq', ${Math.max(lastCode, 1)}, ${lastCode > 0})`,
    );
  });

  return {
    seed: data.seed,
    counts: {
      products: data.products.length,
      customers: data.customers.length,
      orders: data.orders.length,
      orderItems: data.orderItems.length,
    },
  };
}
