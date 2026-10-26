/**
 * Conjunto semilla determinista (Requisito 4.4–4.6).
 *
 * Función pura: con la misma semilla y fecha base produce exactamente los
 * mismos datos (ids incluidos). No usa Date.now() ni Math.random().
 * Imports relativos: también lo cargan scripts fuera de Next.js.
 */
import {
  formatOrderCode,
  ORDER_STATUSES,
  PRODUCT_CATEGORIES,
  type OrderStatus,
} from "../../lib/domain";
import { orderTotals } from "../../lib/finance";
import { POSITION_STEP } from "../../lib/kanban";
import type { NewCustomer, NewOrder, NewOrderItem, NewProduct } from "../db/schema";
import { CITIES, FIRST_NAMES, LAST_NAMES, PRODUCT_CATALOG } from "./data";

export const DEFAULT_SEED = 20261025;
export const DEFAULT_BASE_DATE = "2026-10-01T12:00:00.000Z";

export const SEED_COUNTS = { products: 40, customers: 60, orders: 300 } as const;

/** Reparto exacto de los 300 pedidos por estado (15/15/15/20/28/7 %). */
export const SEED_STATUS_COUNTS: Record<OrderStatus, number> = {
  PENDING: 45,
  PROCESSING: 45,
  PACKED: 45,
  SHIPPED: 60,
  DELIVERED: 84,
  CANCELLED: 21,
};

const HISTORY_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** Generador pseudoaleatorio mulberry32: rápido, pequeño y reproducible. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = ReturnType<typeof mulberry32>;

function intBetween(random: Random, min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(random: Random, items: readonly T[]): T {
  return items[Math.floor(random() * items.length)] as T;
}

function shuffle<T>(random: Random, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j] as T, items[i] as T];
  }
  return items;
}

/** UUID v4 válido construido con el PRNG (estable entre ejecuciones). */
function seededUuid(random: Random): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(random() * 256));
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x40; // versión 4
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80; // variante RFC 4122
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** "José Peña" → "jose.pena" */
function emailLocalPart(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, ".");
}

/** Redondea un precio en céntimos a terminación ,99 (p. ej. 2.437 → 2.399). */
function charmPrice(cents: number): number {
  return Math.max(99, Math.floor(cents / 100) * 100 - 1);
}

export type SeedData = {
  seed: number;
  baseDate: string;
  products: Required<
    Pick<
      NewProduct,
      | "id"
      | "sku"
      | "name"
      | "category"
      | "priceCents"
      | "costCents"
      | "stock"
      | "active"
      | "createdAt"
      | "updatedAt"
    >
  >[];
  customers: Required<Pick<NewCustomer, "id" | "name" | "email" | "city" | "createdAt">>[];
  orders: Required<
    Pick<
      NewOrder,
      | "id"
      | "code"
      | "customerId"
      | "status"
      | "position"
      | "totalCents"
      | "costCents"
      | "itemsCount"
      | "createdAt"
      | "updatedAt"
    >
  >[];
  orderItems: Required<
    Pick<
      NewOrderItem,
      "id" | "orderId" | "productId" | "quantity" | "unitPriceCents" | "unitCostCents"
    >
  >[];
};

export function generateSeed({
  seed = DEFAULT_SEED,
  baseDate = DEFAULT_BASE_DATE,
}: { seed?: number; baseDate?: string } = {}): SeedData {
  const random = mulberry32(seed);
  const base = new Date(baseDate).getTime();
  if (Number.isNaN(base)) throw new RangeError(`Fecha base no válida: ${baseDate}`);
  const catalogCreatedAt = new Date(base - (HISTORY_DAYS + 30) * DAY_MS);

  // --- Productos ---------------------------------------------------------
  const products: SeedData["products"] = [];
  for (const category of PRODUCT_CATEGORIES) {
    const { prefix, priceRange, names } = PRODUCT_CATALOG[category];
    names.forEach((name, index) => {
      const priceCents = charmPrice(intBetween(random, priceRange[0], priceRange[1]));
      // Costo entre el 45 % y el 75 % del precio.
      const costCents = Math.round(priceCents * (0.45 + random() * 0.3));
      products.push({
        id: seededUuid(random),
        sku: `${prefix}-${String(index + 1).padStart(3, "0")}`,
        name,
        category,
        priceCents,
        costCents,
        stock: intBetween(random, 0, 200),
        // ~1 de cada 10 productos inactivo, para probar filtros y bulk.
        active: random() >= 0.1,
        createdAt: catalogCreatedAt,
        updatedAt: catalogCreatedAt,
      });
    });
  }

  // --- Clientes ----------------------------------------------------------
  const customers: SeedData["customers"] = [];
  const usedEmails = new Set<string>();
  for (let i = 0; i < SEED_COUNTS.customers; i++) {
    const name = `${pick(random, FIRST_NAMES)} ${pick(random, LAST_NAMES)}`;
    let local = emailLocalPart(name);
    let suffix = 1;
    while (usedEmails.has(local)) local = `${emailLocalPart(name)}${++suffix}`;
    usedEmails.add(local);
    customers.push({
      id: seededUuid(random),
      name,
      email: `${local}@example.com`,
      city: pick(random, CITIES),
      createdAt: catalogCreatedAt,
    });
  }

  // --- Pedidos -----------------------------------------------------------
  // Fechas repartidas en los últimos 90 días, al minuto, en orden cronológico:
  // OM-0001 es el pedido más antiguo.
  const createdTimes = Array.from({ length: SEED_COUNTS.orders }, () => {
    const offset = Math.floor(random() * HISTORY_DAYS * DAY_MS);
    return Math.floor((base - offset) / MINUTE_MS) * MINUTE_MS;
  }).sort((a, b) => a - b);

  const statuses = shuffle(
    random,
    ORDER_STATUSES.flatMap((status) => Array<OrderStatus>(SEED_STATUS_COUNTS[status]).fill(status)),
  );
  // Requisito 4.6: OM-0001 siempre en PENDING (se intercambia con otro pendiente).
  if (statuses[0] !== "PENDING") {
    const swap = statuses.indexOf("PENDING", 1);
    statuses[swap] = statuses[0] as OrderStatus;
    statuses[0] = "PENDING";
  }

  const columnCounts = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0])) as Record<
    OrderStatus,
    number
  >;

  const orders: SeedData["orders"] = [];
  const orderItems: SeedData["orderItems"] = [];

  createdTimes.forEach((time, index) => {
    const status = statuses[index] as OrderStatus;
    const orderId = seededUuid(random);

    // 1–4 líneas con productos distintos y cantidades 1–3.
    const lineCount = intBetween(random, 1, 4);
    const chosen = shuffle(random, [...products]).slice(0, lineCount);
    const lines = chosen.map((product) => ({
      id: seededUuid(random),
      orderId,
      productId: product.id,
      quantity: random() < 0.7 ? 1 : intBetween(random, 2, 3),
      unitPriceCents: product.priceCents,
      unitCostCents: product.costCents,
    }));
    orderItems.push(...lines);

    // Dentro de cada columna, del más antiguo al más reciente (1000, 2000, …).
    columnCounts[status] += 1;
    const createdAt = new Date(time);
    orders.push({
      id: orderId,
      code: formatOrderCode(index + 1),
      customerId: pick(random, customers).id,
      status,
      position: columnCounts[status] * POSITION_STEP,
      ...orderTotals(lines),
      createdAt,
      updatedAt: createdAt,
    });
  });

  return { seed, baseDate, products, customers, orders, orderItems };
}
