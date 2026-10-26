import { z } from "zod";
import { ORDER_STATUSES, PAGE_LIMIT_MAX, PRODUCT_CATEGORIES } from "../domain";

// Mensajes por defecto de Zod en español (para los casos sin mensaje propio).
z.config(z.locales.es());

export const idSchema = z.uuid({ error: "Identificador no válido" });

export const orderStatusSchema = z.enum(ORDER_STATUSES, {
  error: "Estado de pedido no válido",
});

export const productCategorySchema = z.enum(PRODUCT_CATEGORIES, {
  error: "Categoría no válida",
});

/** Importe en unidades mayores con como máximo 2 decimales. */
export const moneySchema = z
  // z.number() ya rechaza NaN e Infinity (p. ej. un input vacío con valueAsNumber).
  .number({ error: "Introduce un importe" })
  .max(1_000_000, { error: "El importe máximo es 1.000.000" })
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
    error: "Usa como máximo 2 decimales",
  });

/** Lista de ids sin duplicados, con un tamaño máximo. */
export function uniqueIdsSchema(max: number) {
  return z
    .array(idSchema, { error: "Selecciona al menos un registro" })
    .min(1, { error: "Selecciona al menos un registro" })
    .max(max, { error: `Puedes actualizar como máximo ${max} registros a la vez` })
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "Hay registros repetidos en la selección",
    });
}

/**
 * Parámetros de paginación desde la query string. Los valores llegan como
 * texto; `undefined` (parámetro ausente) aplica el valor por defecto.
 */
export function paginationQuerySchema(defaultLimit: number) {
  return z.object({
    page: z.coerce
      .number({ error: "page debe ser un número" })
      .int({ error: "page debe ser un entero" })
      .min(1, { error: "page debe ser ≥ 1" })
      .max(1_000_000, { error: "page es demasiado grande" })
      .default(1),
    limit: z.coerce
      .number({ error: "limit debe ser un número" })
      .int({ error: "limit debe ser un entero" })
      .min(1, { error: "limit debe ser ≥ 1" })
      .max(PAGE_LIMIT_MAX, { error: `limit debe ser ≤ ${PAGE_LIMIT_MAX}` })
      .default(defaultLimit),
  });
}

/** Texto de búsqueda opcional; vacío equivale a ausente. */
export const searchTextSchema = z
  .string()
  .trim()
  .max(100, { error: "La búsqueda admite como máximo 100 caracteres" })
  .optional()
  .transform((value) => (value ? value : undefined));

/** Fecha de calendario YYYY-MM-DD (filtros de rango). */
export const isoDateSchema = z.iso.date({ error: "Fecha no válida (AAAA-MM-DD)" });
