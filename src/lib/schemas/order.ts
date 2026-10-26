import { z } from "zod";
import { BULK_MAX_IDS } from "../domain";
import {
  idSchema,
  isoDateSchema,
  orderStatusSchema,
  paginationQuerySchema,
  searchTextSchema,
  uniqueIdsSchema,
} from "./common";

export const ORDER_MAX_ITEMS = 20;
export const ORDER_MAX_QUANTITY = 99;

export const orderItemInputSchema = z.object({
  productId: idSchema,
  quantity: z
    .number({ error: "Introduce la cantidad" })
    .int({ error: "La cantidad debe ser un número entero" })
    .min(1, { error: "La cantidad mínima es 1" })
    .max(ORDER_MAX_QUANTITY, { error: `La cantidad máxima es ${ORDER_MAX_QUANTITY}` }),
});

/**
 * Alta de pedido. Solo se reciben productos y cantidades: precios, costos y
 * totales los calcula el servidor (el cliente no puede fijarlos).
 */
export const orderCreateSchema = z.object({
  customerId: idSchema,
  items: z
    .array(orderItemInputSchema, { error: "Añade al menos un producto" })
    .min(1, { error: "Añade al menos un producto" })
    .max(ORDER_MAX_ITEMS, { error: `Un pedido admite como máximo ${ORDER_MAX_ITEMS} productos` })
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, {
      error: "Hay productos repetidos; ajusta la cantidad en una sola línea",
    }),
});

/** Movimiento en el Kanban: estado destino e índice dentro de la columna (desde 0). */
export const moveOrderSchema = z.object({
  toStatus: orderStatusSchema,
  toIndex: z
    .number({ error: "toIndex debe ser un número" })
    .int({ error: "toIndex debe ser un entero" })
    .min(0, { error: "toIndex debe ser ≥ 0" })
    .max(100_000, { error: "toIndex es demasiado grande" }),
});

/** Cambio de estado en lote (Requisito 12.2). */
export const bulkOrderSchema = z.object({
  ids: uniqueIdsSchema(BULK_MAX_IDS),
  status: orderStatusSchema,
});

export const orderListQuerySchema = paginationQuerySchema(20)
  .extend({
    q: searchTextSchema,
    status: orderStatusSchema.optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    error: "La fecha inicial no puede ser posterior a la final",
    path: ["to"],
  });

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type MoveOrderInput = z.infer<typeof moveOrderSchema>;
export type BulkOrderInput = z.infer<typeof bulkOrderSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
