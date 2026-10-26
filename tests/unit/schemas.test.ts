import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  analyticsQuerySchema,
  bulkOrderSchema,
  bulkProductSchema,
  kanbanStatusQuerySchema,
  orderCreateSchema,
  productCreateSchema,
  productUpdateSchema,
} from "@/lib/schemas";

/** Rutas de los campos con error, p. ej. ["sku", "items.0.quantity"]. */
function errorPaths(result: z.ZodSafeParseResult<unknown>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

function errorMessages(result: z.ZodSafeParseResult<unknown>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

const validProduct = {
  sku: " kb-2026 ",
  name: "  Teclado mecánico ",
  category: "ELECTRONICS",
  price: 49.9,
  cost: 20,
  stock: 15,
  active: true,
};

describe("productCreateSchema", () => {
  it("acepta un producto válido y normaliza SKU y nombre", () => {
    const result = productCreateSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ sku: "KB-2026", name: "Teclado mecánico", price: 49.9 });
  });

  it("rechaza SKU, precio y stock inválidos, y costo mayor que el precio", () => {
    const invalidFields = productCreateSchema.safeParse({
      ...validProduct,
      sku: "A!",
      price: 0,
      stock: 1.5,
      category: "FOOD",
    });
    expect(errorPaths(invalidFields)).toEqual(
      expect.arrayContaining(["sku", "price", "stock", "category"]),
    );

    const threeDecimals = productCreateSchema.safeParse({ ...validProduct, price: 10.999 });
    expect(errorMessages(threeDecimals)).toContain("Usa como máximo 2 decimales");

    const costAbovePrice = productCreateSchema.safeParse({ ...validProduct, price: 10, cost: 12 });
    expect(errorPaths(costAbovePrice)).toEqual(["cost"]);
    expect(errorMessages(costAbovePrice)).toEqual(["El costo no puede ser mayor que el precio"]);
  });

  it("productUpdateSchema exige al menos un cambio y valida precio/costo juntos", () => {
    expect(productUpdateSchema.safeParse({}).success).toBe(false);
    expect(productUpdateSchema.safeParse({ stock: 3 }).success).toBe(true);
    expect(errorPaths(productUpdateSchema.safeParse({ price: 5, cost: 6 }))).toEqual(["cost"]);
  });
});

describe("orderCreateSchema", () => {
  const customerId = randomUUID();
  const productId = randomUUID();

  it("rechaza pedidos sin líneas, cantidades fuera de rango y productos repetidos", () => {
    expect(
      orderCreateSchema.safeParse({ customerId, items: [{ productId, quantity: 2 }] }).success,
    ).toBe(true);

    const empty = orderCreateSchema.safeParse({ customerId, items: [] });
    expect(errorMessages(empty)).toEqual(["Añade al menos un producto"]);

    const outOfRange = orderCreateSchema.safeParse({
      customerId,
      items: [
        { productId, quantity: 0 },
        { productId: randomUUID(), quantity: 100 },
      ],
    });
    expect(errorPaths(outOfRange)).toEqual(["items.0.quantity", "items.1.quantity"]);

    const duplicated = orderCreateSchema.safeParse({
      customerId,
      items: [
        { productId, quantity: 1 },
        { productId, quantity: 2 },
      ],
    });
    expect(errorPaths(duplicated)).toEqual(["items"]);

    expect(errorPaths(orderCreateSchema.safeParse({ customerId: "123", items: [] }))).toContain(
      "customerId",
    );
  });
});

describe("esquemas de edición en lote", () => {
  it("bulkOrderSchema limita a 100 ids únicos y exige un estado válido", () => {
    const twoIds = [randomUUID(), randomUUID()];
    expect(bulkOrderSchema.safeParse({ ids: twoIds, status: "SHIPPED" }).success).toBe(true);

    const tooMany = bulkOrderSchema.safeParse({
      ids: Array.from({ length: 101 }, () => randomUUID()),
      status: "SHIPPED",
    });
    expect(errorMessages(tooMany)).toEqual([
      "Puedes actualizar como máximo 100 registros a la vez",
    ]);

    const duplicated = bulkOrderSchema.safeParse({
      ids: [twoIds[0], twoIds[0]],
      status: "SHIPPED",
    });
    expect(errorMessages(duplicated)).toEqual(["Hay registros repetidos en la selección"]);

    expect(errorPaths(bulkOrderSchema.safeParse({ ids: [], status: "LOST" }))).toEqual(
      expect.arrayContaining(["ids", "status"]),
    );

    expect(bulkProductSchema.safeParse({ ids: twoIds, patch: {} }).success).toBe(false);
    expect(bulkProductSchema.safeParse({ ids: twoIds, patch: { active: false } }).success).toBe(
      true,
    );
  });
});

describe("esquemas de los endpoints de auditoría", () => {
  it("analyticsQuerySchema aplica valores por defecto y rechaza límites fuera de rango", () => {
    expect(analyticsQuerySchema.parse({})).toEqual({ page: 1, limit: 50 });
    expect(analyticsQuerySchema.parse({ page: "2", limit: "10" })).toEqual({ page: 2, limit: 10 });
    expect(analyticsQuerySchema.parse({ limit: "100" }).limit).toBe(100);

    for (const limit of ["0", "101", "abc", "2.5"]) {
      expect(analyticsQuerySchema.safeParse({ limit }).success, `limit=${limit}`).toBe(false);
    }
    for (const page of ["0", "-1", "1.5"]) {
      expect(analyticsQuerySchema.safeParse({ page }).success, `page=${page}`).toBe(false);
    }
  });

  it("kanbanStatusQuerySchema normaliza el código y no admite orderId y code a la vez", () => {
    expect(kanbanStatusQuerySchema.parse({ code: " om-0001 " })).toEqual({ code: "OM-0001" });
    expect(kanbanStatusQuerySchema.parse({})).toEqual({});
    expect(kanbanStatusQuerySchema.safeParse({ orderId: "no-es-uuid" }).success).toBe(false);
    expect(kanbanStatusQuerySchema.safeParse({ code: "PED-1" }).success).toBe(false);
    expect(
      kanbanStatusQuerySchema.safeParse({ orderId: randomUUID(), code: "OM-0001" }).success,
    ).toBe(false);
  });
});
