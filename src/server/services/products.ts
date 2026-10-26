import "server-only";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import type { Paginated, ProductDto } from "@/lib/api-types";
import { marginPct } from "@/lib/finance";
import { pageMeta, pageOffset } from "@/lib/filters";
import { fromCents, toCents } from "@/lib/format";
import type { ProductCreateInput, ProductListQuery, ProductUpdateInput } from "@/lib/schemas";
import type { Db } from "../db/client";
import { products, type Product } from "../db/schema";
import {
  DomainError,
  notFound,
  pgErrorCode,
  PG_FOREIGN_KEY_VIOLATION,
  PG_UNIQUE_VIOLATION,
} from "../errors";
import { containsPattern } from "../sql";

export function toProductDto(row: Product): ProductDto {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.category,
    price: fromCents(row.priceCents),
    cost: fromCents(row.costCents),
    stock: row.stock,
    active: row.active,
    marginPct: marginPct(row.priceCents, row.costCents),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const skuTaken = (sku: string) =>
  new DomainError(409, "SKU_TAKEN", `Ya existe un producto con el SKU ${sku}`, [
    { path: "sku", message: "Este SKU ya está en uso" },
  ]);

function productFilters(
  query: Pick<ProductListQuery, "q" | "category" | "active">,
): SQL | undefined {
  const pattern = query.q ? containsPattern(query.q) : undefined;
  return and(
    pattern ? or(ilike(products.name, pattern), ilike(products.sku, pattern)) : undefined,
    query.category ? eq(products.category, query.category) : undefined,
    query.active === undefined ? undefined : eq(products.active, query.active),
  );
}

/** Listado con búsqueda por nombre o SKU, filtros y paginación (Requisito 10.1). */
export async function listProducts(
  db: Db,
  query: ProductListQuery,
): Promise<Paginated<ProductDto>> {
  const where = productFilters(query);
  const [rows, [count]] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      // Más recientes primero: un producto recién creado queda visible en la
      // primera página. A igual fecha (p. ej. la semilla), orden alfabético.
      .orderBy(desc(products.createdAt), asc(products.name), asc(products.id))
      .limit(query.limit)
      .offset(pageOffset(query.page, query.limit)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(products)
      .where(where),
  ]);

  return {
    data: rows.map(toProductDto),
    meta: pageMeta(count?.total ?? 0, query.page, query.limit),
  };
}

/** Alta de producto (Requisito 10.2). SKU duplicado → 409. */
export async function createProduct(db: Db, input: ProductCreateInput): Promise<ProductDto> {
  try {
    const [row] = await db
      .insert(products)
      .values({
        sku: input.sku,
        name: input.name,
        category: input.category,
        priceCents: toCents(input.price),
        costCents: toCents(input.cost),
        stock: input.stock,
        active: input.active,
      })
      .returning();
    return toProductDto(row as Product);
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw skuTaken(input.sku);
    throw error;
  }
}

/**
 * Edición parcial (Requisito 10.3). Si solo cambia el precio o el costo, la
 * regla "costo ≤ precio" se valida contra el valor guardado, en la misma transacción.
 */
export async function updateProduct(
  db: Db,
  id: string,
  patch: ProductUpdateInput,
): Promise<ProductDto> {
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(products).where(eq(products.id, id)).for("update");
      if (!current) throw notFound("Producto no encontrado");

      const priceCents = patch.price === undefined ? current.priceCents : toCents(patch.price);
      const costCents = patch.cost === undefined ? current.costCents : toCents(patch.cost);
      if (costCents > priceCents) {
        throw new DomainError(400, "VALIDATION_ERROR", "Los datos enviados no son válidos", [
          { path: "cost", message: "El costo no puede ser mayor que el precio" },
        ]);
      }

      const [row] = await tx
        .update(products)
        .set({
          ...(patch.sku === undefined ? {} : { sku: patch.sku }),
          ...(patch.name === undefined ? {} : { name: patch.name }),
          ...(patch.category === undefined ? {} : { category: patch.category }),
          ...(patch.stock === undefined ? {} : { stock: patch.stock }),
          ...(patch.active === undefined ? {} : { active: patch.active }),
          priceCents,
          costCents,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();
      return toProductDto(row as Product);
    });
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) throw skuTaken(patch.sku ?? "");
    throw error;
  }
}

/**
 * Baja de producto. Un producto con ventas no se puede borrar (FK RESTRICT):
 * se responde 409 y se sugiere desactivarlo (Requisito 10.4).
 */
export async function deleteProduct(db: Db, id: string): Promise<void> {
  try {
    const deleted = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (deleted.length === 0) throw notFound("Producto no encontrado");
  } catch (error) {
    if (pgErrorCode(error) === PG_FOREIGN_KEY_VIOLATION) {
      throw new DomainError(
        409,
        "PRODUCT_IN_USE",
        "El producto tiene ventas registradas y no se puede eliminar. Desactívalo en su lugar.",
      );
    }
    throw error;
  }
}
