/**
 * Vocabulario del dominio compartido por todas las capas.
 * Los valores coinciden con los enums de Postgres (tarea 3).
 */

export const ORDER_STATUSES = [
  "PENDING",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PROCESSING: "En proceso",
  PACKED: "Empaquetado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const PRODUCT_CATEGORIES = [
  "ELECTRONICS",
  "HOME",
  "FASHION",
  "SPORTS",
  "BEAUTY",
  "TOYS",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_CATEGORY_LABELS: Record<ProductCategory, string> = {
  ELECTRONICS: "Electrónica",
  HOME: "Hogar",
  FASHION: "Moda",
  SPORTS: "Deportes",
  BEAUTY: "Belleza",
  TOYS: "Juguetes",
};

/** Formato del código de pedido visible: OM-0001, OM-0300, OM-12345… */
export const ORDER_CODE_PATTERN = /^OM-\d{4,}$/;

export function formatOrderCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Secuencia de pedido inválida: ${sequence}`);
  }
  return `OM-${String(sequence).padStart(4, "0")}`;
}

/** Límite de registros por edición en lote (Requisito 12.7). */
export const BULK_MAX_IDS = 100;

/** Límite de filas por página en listados y en /api/test/analytics (Requisito 5.1). */
export const PAGE_LIMIT_MAX = 100;
