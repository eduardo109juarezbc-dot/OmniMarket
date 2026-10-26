import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema> & { $client: postgres.Sql };

export type CreateDbOptions = {
  /** Conexiones simultáneas por instancia. */
  max?: number;
};

/**
 * Crea un cliente Drizzle sobre postgres-js. Sin dependencias de Next.js, para
 * que lo usen también los scripts (seed) y las pruebas.
 *
 * `prepare: false` es obligatorio con el pooler de Supabase en modo transacción
 * (puerto 6543), que no admite sentencias preparadas con nombre.
 * `max: 5` permite las dos consultas en paralelo de la analítica y algo de
 * concurrencia por instancia sin agotar el pooler.
 */
export function createDb(url: string, { max = 5 }: CreateDbOptions = {}): Db {
  const client = postgres(url, {
    prepare: false,
    max,
    idle_timeout: 20,
    connect_timeout: 10,
    // Silencia los NOTICE de Postgres (p. ej. TRUNCATE … CASCADE).
    onnotice: () => {},
  });
  return drizzle(client, { schema });
}
