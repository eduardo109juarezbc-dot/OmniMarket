import "server-only";
import { asc, ilike } from "drizzle-orm";
import type { CustomerOptionDto } from "@/lib/api-types";
import type { CustomerQuery } from "@/lib/schemas";
import type { Db } from "../db/client";
import { customers } from "../db/schema";
import { containsPattern } from "../sql";

/** Opciones del selector de cliente del formulario de pedido (sin emails). */
export async function listCustomers(db: Db, { q }: CustomerQuery): Promise<CustomerOptionDto[]> {
  return db
    .select({ id: customers.id, name: customers.name, city: customers.city })
    .from(customers)
    .where(q ? ilike(customers.name, containsPattern(q)) : undefined)
    .orderBy(asc(customers.name), asc(customers.id))
    .limit(100);
}
