import type { OrderStatus, ProductCategory } from "./domain";

/**
 * Lógica de filtrado y paginación en memoria. La usan la UI (filtrado de la
 * caché local y actualizaciones optimistas) y las pruebas; el servidor aplica
 * los mismos criterios en SQL.
 */

/** Minúsculas, sin acentos ni espacios extremos: "Peña " → "pena". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function matchesText(query: string | undefined, ...fields: string[]): boolean {
  if (!query) return true;
  const needle = normalizeText(query);
  if (!needle) return true;
  return fields.some((field) => normalizeText(field).includes(needle));
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Inicio del día (UTC) de una fecha AAAA-MM-DD, en milisegundos. */
function startOfDayUtc(isoDate: string): number {
  const time = Date.parse(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(time)) throw new RangeError(`Fecha no válida: ${isoDate}`);
  return time;
}

export type FilterableOrder = {
  code: string;
  customerName: string;
  status: OrderStatus;
  createdAt: Date | string;
};

export type OrderFilters = {
  status?: OrderStatus;
  /** Busca en el código del pedido y en el nombre del cliente. */
  q?: string;
  /** Desde (inclusive), AAAA-MM-DD en UTC. */
  from?: string;
  /** Hasta (inclusive, día completo), AAAA-MM-DD en UTC. */
  to?: string;
};

export function filterOrders<T extends FilterableOrder>(
  orders: readonly T[],
  filters: OrderFilters,
): T[] {
  const fromMs = filters.from ? startOfDayUtc(filters.from) : -Infinity;
  const toMs = filters.to ? startOfDayUtc(filters.to) + DAY_MS : Infinity;

  return orders.filter((order) => {
    if (filters.status && order.status !== filters.status) return false;
    const created = new Date(order.createdAt).getTime();
    if (created < fromMs || created >= toMs) return false;
    return matchesText(filters.q, order.code, order.customerName);
  });
}

export type FilterableProduct = {
  sku: string;
  name: string;
  category: ProductCategory;
  active: boolean;
};

export type ProductFilters = {
  /** Busca en el nombre y en el SKU. */
  q?: string;
  category?: ProductCategory;
  active?: boolean;
};

export function filterProducts<T extends FilterableProduct>(
  products: readonly T[],
  filters: ProductFilters,
): T[] {
  return products.filter((product) => {
    if (filters.category && product.category !== filters.category) return false;
    if (filters.active !== undefined && product.active !== filters.active) return false;
    return matchesText(filters.q, product.name, product.sku);
  });
}

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function assertPositiveInt(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} debe ser un entero ≥ 1 (recibido ${value})`);
  }
}

/** Metadatos de paginación. `totalPages` es 0 cuando no hay registros. */
export function pageMeta(total: number, page: number, limit: number): PageMeta {
  assertPositiveInt("page", page);
  assertPositiveInt("limit", limit);
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

/** Desplazamiento SQL equivalente a una página. */
export function pageOffset(page: number, limit: number): number {
  assertPositiveInt("page", page);
  assertPositiveInt("limit", limit);
  return (page - 1) * limit;
}

/** Corta una página de una lista. Una página fuera de rango devuelve `data` vacío. */
export function paginate<T>(
  items: readonly T[],
  page: number,
  limit: number,
): { data: T[]; meta: PageMeta } {
  const offset = pageOffset(page, limit);
  return {
    data: items.slice(offset, offset + limit),
    meta: pageMeta(items.length, page, limit),
  };
}
