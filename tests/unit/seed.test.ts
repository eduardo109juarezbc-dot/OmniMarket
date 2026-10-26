import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/domain";
import { orderTotals } from "@/lib/finance";
import {
  DEFAULT_BASE_DATE,
  generateSeed,
  SEED_COUNTS,
  SEED_STATUS_COUNTS,
} from "@/server/seed/generate";

describe("generateSeed", () => {
  const seed = generateSeed();

  it("es determinista y cumple conteos, reparto de estados y la regla de OM-0001", () => {
    // Dos ejecuciones producen exactamente los mismos datos (ids incluidos).
    expect(generateSeed()).toEqual(seed);
    // Otra semilla produce otros datos.
    expect(generateSeed({ seed: 1 }).orders[0]?.id).not.toBe(seed.orders[0]?.id);

    expect(seed.products).toHaveLength(SEED_COUNTS.products);
    expect(seed.customers).toHaveLength(SEED_COUNTS.customers);
    expect(seed.orders).toHaveLength(SEED_COUNTS.orders);

    for (const status of ORDER_STATUSES) {
      expect(
        seed.orders.filter((order) => order.status === status),
        status,
      ).toHaveLength(SEED_STATUS_COUNTS[status]);
    }

    // OM-0001: pendiente y primera tarjeta de su columna (Requisito 4.6).
    const first = seed.orders.find((order) => order.code === "OM-0001");
    const pendingPositions = seed.orders
      .filter((order) => order.status === "PENDING")
      .map((order) => order.position);
    expect(first?.status).toBe("PENDING");
    expect(first?.position).toBe(Math.min(...pendingPositions));
    expect(seed.orders.at(-1)?.code).toBe("OM-0300");
  });

  it("genera datos coherentes con las restricciones de la base", () => {
    const allIds = [seed.products, seed.customers, seed.orders, seed.orderItems].flatMap((rows) =>
      rows.map((row) => row.id),
    );
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(allIds.every((id) => z.uuid().safeParse(id).success)).toBe(true);

    expect(new Set(seed.products.map((p) => p.sku)).size).toBe(seed.products.length);
    expect(new Set(seed.customers.map((c) => c.email)).size).toBe(seed.customers.length);
    for (const product of seed.products) {
      expect(product.priceCents).toBeGreaterThan(0);
      expect(product.costCents).toBeGreaterThanOrEqual(0);
      expect(product.costCents).toBeLessThanOrEqual(product.priceCents);
    }

    // Totales del pedido = suma de sus líneas; posiciones únicas por columna.
    const base = new Date(DEFAULT_BASE_DATE).getTime();
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    for (const order of seed.orders) {
      const lines = seed.orderItems.filter((item) => item.orderId === order.id);
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines.length).toBeLessThanOrEqual(4);
      const { totalCents, costCents, itemsCount } = orderTotals(lines);
      expect({ totalCents, costCents, itemsCount }).toEqual({
        totalCents: order.totalCents,
        costCents: order.costCents,
        itemsCount: order.itemsCount,
      });
      const time = order.createdAt.getTime();
      expect(time).toBeLessThanOrEqual(base);
      expect(time).toBeGreaterThan(base - ninetyDays);
    }
    for (const status of ORDER_STATUSES) {
      const positions = seed.orders.filter((o) => o.status === status).map((o) => o.position);
      expect(new Set(positions).size).toBe(positions.length);
    }
  });
});
