import { z } from "zod";
import { BULK_MAX_IDS } from "../domain";
import { productCategorySchema, uniqueIdsSchema } from "./common";

export { bulkOrderSchema, type BulkOrderInput } from "./order";

/** Edición en lote de productos: activar/desactivar o cambiar categoría (Requisito 12.3). */
export const bulkProductSchema = z.object({
  ids: uniqueIdsSchema(BULK_MAX_IDS),
  patch: z
    .object({
      active: z.boolean({ error: "active debe ser verdadero o falso" }).optional(),
      category: productCategorySchema.optional(),
    })
    .refine((patch) => patch.active !== undefined || patch.category !== undefined, {
      error: "Indica al menos un cambio",
    }),
});

export type BulkProductInput = z.infer<typeof bulkProductSchema>;
