import "server-only";

/**
 * Patrón ILIKE "contiene" con los comodines escapados: buscar "50%" o "a_b"
 * no debe interpretarse como comodín (en Postgres el escape por defecto es "\").
 */
export function containsPattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rango [from 00:00 UTC, to+1 día 00:00 UTC) a partir de fechas AAAA-MM-DD. */
export function utcDayRange(from?: string, to?: string): { start?: Date; end?: Date } {
  return {
    start: from ? new Date(`${from}T00:00:00.000Z`) : undefined,
    end: to ? new Date(Date.parse(`${to}T00:00:00.000Z`) + DAY_MS) : undefined,
  };
}
