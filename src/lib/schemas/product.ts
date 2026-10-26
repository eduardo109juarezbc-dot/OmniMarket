import { z } from "zod";
import {
  moneySchema,
  paginationQuerySchema,
  productCategorySchema,
  searchTextSchema,
} from "./common";

export const SKU_PATTERN = /^[A-Z0-9-]{3,20}$/;

const productFields = {
  sku: z.string({ error: "El SKU es obligatorio" }).trim().toUpperCase().regex(SKU_PATTERN, {
    error: "El SKU debe tener de 3 a 20 caracteres: letras, números o guiones",
  }),
  name: z
    .string({ error: "El nombre es obligatorio" })
    .trim()
    .min(2, { error: "El nombre debe tener al menos 2 caracteres" })
    .max(120, { error: "El nombre admite como máximo 120 caracteres" }),
  category: productCategorySchema,
  /** Precio de venta en unidades mayores. */
  price: moneySchema.refine((value) => value > 0, { error: "El precio debe ser mayor que 0" }),
  /** Costo unitario en unidades mayores. */
  cost: moneySchema.refine((value) => value >= 0, { error: "El costo no puede ser negativo" }),
  stock: z
    .number({ error: "Introduce el stock" })
    .int({ error: "El stock debe ser un número entero" })
    .min(0, { error: "El stock no puede ser negativo" })
    .max(1_000_000, { error: "El stock máximo es 1.000.000" }),
  active: z.boolean({ error: "Indica si el producto está activo" }),
};

const COST_ABOVE_PRICE = "El costo no puede ser mayor que el precio";

export const productCreateSchema = z
  .object(productFields)
  .refine((product) => product.cost <= product.price, {
    error: COST_ABOVE_PRICE,
    path: ["cost"],
  });

/**
 * Actualización parcial. Si llegan precio y costo a la vez, se valida su
 * relación aquí; si llega solo uno, el servicio la valida con el valor guardado.
 */
export const productUpdateSchema = z
  .object(productFields)
  .partial()
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    error: "No hay cambios que guardar",
  })
  .refine(
    (patch) => patch.cost === undefined || patch.price === undefined || patch.cost <= patch.price,
    { error: COST_ABOVE_PRICE, path: ["cost"] },
  );

export const productListQuerySchema = paginationQuerySchema(20).extend({
  q: searchTextSchema,
  category: productCategorySchema.optional(),
  active: z
    .enum(["true", "false"], { error: "active debe ser true o false" })
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
