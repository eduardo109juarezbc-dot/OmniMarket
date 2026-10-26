import "server-only";
import { serverEnv } from "../env";
import { createDb, type Db } from "./create";

export type { Db } from "./create";

/**
 * Cliente de base de datos de la app (runtime de Vercel).
 *
 * Se crea de forma perezosa en la primera consulta: así `next build` no exige
 * DATABASE_URL. La instancia se reutiliza entre invocaciones de la misma función
 * (Fluid Compute) y, en desarrollo, entre recargas de HMR vía globalThis.
 */
const globalForDb = globalThis as unknown as { __omnimarketDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__omnimarketDb) {
    globalForDb.__omnimarketDb = createDb(serverEnv().DATABASE_URL);
  }
  return globalForDb.__omnimarketDb;
}
