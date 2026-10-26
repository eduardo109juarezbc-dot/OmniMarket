import { describe, expect, it } from "vitest";
import {
  averageTicket,
  buildSalesSummary,
  emptyStatusCount,
  grossMargin,
  marginPct,
  orderTotals,
  summarizeOrders,
  type OrderForSummary,
} from "@/lib/finance";

describe("averageTicket", () => {
  it("divide ingresos entre pedidos y redondea al céntimo", () => {
    expect(averageTicket(30_000, 3)).toBe(10_000);
    // 100,00 / 3 = 33,333… → 33,33
    expect(averageTicket(10_000, 3)).toBe(3_333);
    // 0,05 / 2 = 0,025 → 0,03 (redondeo estándar al céntimo)
    expect(averageTicket(5, 2)).toBe(3);
  });

  it("devuelve 0 sin pedidos, nunca NaN ni Infinity", () => {
    expect(averageTicket(0, 0)).toBe(0);
    expect(averageTicket(12_345, 0)).toBe(0);
    expect(averageTicket(12_345, -1)).toBe(0);
  });
});

describe("grossMargin y marginPct", () => {
  it("calcula margen bruto y porcentaje sobre ingresos", () => {
    expect(grossMargin(20_000, 12_500)).toBe(7_500);
    expect(marginPct(20_000, 12_500)).toBe(37.5);
    // 1/3 → 33,33 % (2 decimales)
    expect(marginPct(30_000, 20_000)).toBe(33.33);
    // Venta a pérdida: margen negativo
    expect(grossMargin(10_000, 12_000)).toBe(-2_000);
    expect(marginPct(10_000, 12_000)).toBe(-20);
  });

  it("devuelve 0 % cuando no hay ingresos", () => {
    expect(marginPct(0, 0)).toBe(0);
    expect(marginPct(0, 5_000)).toBe(0);
  });
});

describe("orderTotals y summarizeOrders", () => {
  it("suma las líneas de un pedido y excluye CANCELLED del resumen de ventas", () => {
    expect(
      orderTotals([
        { quantity: 2, unitPriceCents: 1_999, unitCostCents: 1_200 },
        { quantity: 1, unitPriceCents: 5_000, unitCostCents: 3_100 },
      ]),
    ).toEqual({ totalCents: 8_998, costCents: 5_500, itemsCount: 3 });
    expect(orderTotals([])).toEqual({ totalCents: 0, costCents: 0, itemsCount: 0 });

    const orders: OrderForSummary[] = [
      { status: "DELIVERED", totalCents: 10_000, costCents: 6_000 },
      { status: "SHIPPED", totalCents: 20_000, costCents: 11_000 },
      { status: "CANCELLED", totalCents: 99_999, costCents: 1 },
    ];
    const summary = summarizeOrders(orders);

    expect(summary.revenueCents).toBe(30_000);
    expect(summary.costCents).toBe(17_000);
    expect(summary.orderCount).toBe(2);
    expect(summary.averageTicketCents).toBe(15_000);
    expect(summary.grossMarginCents).toBe(13_000);
    expect(summary.marginPct).toBe(43.33);
    // Los cancelados sí cuentan en el desglose por estado.
    expect(summary.ordersByStatus).toEqual({
      ...emptyStatusCount(),
      DELIVERED: 1,
      SHIPPED: 1,
      CANCELLED: 1,
    });
  });

  it("buildSalesSummary con agregados vacíos no produce NaN", () => {
    const summary = buildSalesSummary({
      revenueCents: 0,
      costCents: 0,
      orderCount: 0,
      ordersByStatus: emptyStatusCount(),
    });
    expect(summary).toMatchObject({ averageTicketCents: 0, grossMarginCents: 0, marginPct: 0 });
    expect(Object.values(summary).every((value) => !Number.isNaN(value))).toBe(true);
  });
});
