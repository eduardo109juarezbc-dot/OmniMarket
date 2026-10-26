import { describe, expect, it } from "vitest";
import {
  filterOrders,
  filterProducts,
  normalizeText,
  pageMeta,
  pageOffset,
  paginate,
  type FilterableOrder,
  type FilterableProduct,
} from "@/lib/filters";

const orders: FilterableOrder[] = [
  {
    code: "OM-0001",
    customerName: "José Peña",
    status: "PENDING",
    createdAt: "2026-10-01T10:00:00Z",
  },
  {
    code: "OM-0002",
    customerName: "Ana Gómez",
    status: "SHIPPED",
    createdAt: "2026-10-05T23:59:59Z",
  },
  {
    code: "OM-0003",
    customerName: "Luis Ortiz",
    status: "PENDING",
    createdAt: "2026-10-06T00:00:00Z",
  },
];

const codes = (list: FilterableOrder[]) => list.map((order) => order.code);

describe("filterOrders", () => {
  it("filtra por estado, texto (sin acentos ni mayúsculas) y rango de fechas inclusivo", () => {
    expect(normalizeText("  José PEÑA ")).toBe("jose pena");

    expect(codes(filterOrders(orders, {}))).toEqual(["OM-0001", "OM-0002", "OM-0003"]);
    expect(codes(filterOrders(orders, { status: "PENDING" }))).toEqual(["OM-0001", "OM-0003"]);
    expect(codes(filterOrders(orders, { q: "pena" }))).toEqual(["OM-0001"]);
    expect(codes(filterOrders(orders, { q: "GÓMEZ" }))).toEqual(["OM-0002"]);
    expect(codes(filterOrders(orders, { q: "om-0003" }))).toEqual(["OM-0003"]);
    expect(codes(filterOrders(orders, { q: "   " }))).toHaveLength(3);

    // "to" incluye el día completo: 23:59:59 del día 5 entra, 00:00 del día 6 no.
    expect(codes(filterOrders(orders, { from: "2026-10-02", to: "2026-10-05" }))).toEqual([
      "OM-0002",
    ]);
    expect(codes(filterOrders(orders, { status: "PENDING", from: "2026-10-06" }))).toEqual([
      "OM-0003",
    ]);
    expect(filterOrders(orders, { q: "inexistente" })).toEqual([]);
  });
});

describe("filterProducts y paginate", () => {
  const products: FilterableProduct[] = Array.from({ length: 45 }, (_, i) => ({
    sku: `SKU-${String(i + 1).padStart(3, "0")}`,
    name: i === 0 ? "Cámara réflex" : `Producto ${i + 1}`,
    category: i % 3 === 0 ? "ELECTRONICS" : "HOME",
    active: i % 5 !== 0,
  }));

  it("filtra por categoría, estado activo y texto en nombre o SKU", () => {
    expect(filterProducts(products, { category: "ELECTRONICS" })).toHaveLength(15);
    expect(filterProducts(products, { active: false })).toHaveLength(9);
    expect(filterProducts(products, { category: "ELECTRONICS", active: true })).toHaveLength(12);
    expect(filterProducts(products, { q: "camara" }).map((p) => p.sku)).toEqual(["SKU-001"]);
    expect(filterProducts(products, { q: "sku-045" }).map((p) => p.sku)).toEqual(["SKU-045"]);
  });

  it("pagina en los límites y rechaza parámetros inválidos", () => {
    const last = paginate(products, 3, 20);
    expect(last.data.map((p) => p.sku)).toEqual([
      "SKU-041",
      "SKU-042",
      "SKU-043",
      "SKU-044",
      "SKU-045",
    ]);
    expect(last.meta).toEqual({ page: 3, limit: 20, total: 45, totalPages: 3 });

    const beyond = paginate(products, 4, 20);
    expect(beyond.data).toEqual([]);
    expect(beyond.meta.total).toBe(45);

    expect(paginate([], 1, 50).meta).toEqual({ page: 1, limit: 50, total: 0, totalPages: 0 });
    expect(pageMeta(100, 1, 50).totalPages).toBe(2);
    expect(pageOffset(3, 50)).toBe(100);

    expect(() => paginate(products, 0, 20)).toThrow(RangeError);
    expect(() => paginate(products, 1, 0)).toThrow(RangeError);
    expect(() => pageOffset(1.5, 20)).toThrow(RangeError);
  });
});
