/**
 * Esquema de la base de datos (Drizzle). Fuente de verdad para las migraciones
 * generadas en /drizzle.
 *
 * Usa imports relativos (no "@/") porque drizzle-kit carga este archivo con su
 * propio bundler, que no conoce los alias de tsconfig.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { ORDER_STATUSES, PRODUCT_CATEGORIES } from "../../lib/domain";

export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);
export const productCategoryEnum = pgEnum("product_category", PRODUCT_CATEGORIES);

/**
 * Numeración visible de pedidos (OM-0001…). El código se formatea en la app con
 * `formatOrderCode`, que no trunca a partir de 9999 (lpad sí lo haría).
 */
export const orderCodeSeq = pgSequence("order_code_seq", { startWith: 1 });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  city: text("city").notNull(),
  createdAt: timestamps.createdAt,
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    category: productCategoryEnum("category").notNull(),
    priceCents: integer("price_cents").notNull(),
    costCents: integer("cost_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [
    index("products_category_active_idx").on(table.category, table.active),
    check("products_price_positive", sql`${table.priceCents} > 0`),
    check(
      "products_cost_range",
      sql`${table.costCents} >= 0 and ${table.costCents} <= ${table.priceCents}`,
    ),
    check("products_stock_non_negative", sql`${table.stock} >= 0`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("PENDING"),
    /** Posición fraccional dentro de la columna del Kanban (ver lib/kanban.ts). */
    position: doublePrecision("position").notNull(),
    // Totales desnormalizados desde order_items para que la analítica agregue
    // una sola tabla (SLA < 300 ms).
    totalCents: integer("total_cents").notNull(),
    costCents: integer("cost_cents").notNull(),
    itemsCount: integer("items_count").notNull(),
    ...timestamps,
  },
  (table) => [
    index("orders_status_position_idx").on(table.status, table.position),
    // NULLS FIRST explícito: es el orden por defecto de `ORDER BY created_at DESC`.
    // Con "DESC NULLS LAST" (lo que genera .desc()) Postgres no usaría el índice
    // para la paginación de la analítica, aunque la columna sea NOT NULL.
    index("orders_created_at_code_idx").on(table.createdAt.desc().nullsFirst(), table.code),
    index("orders_customer_id_idx").on(table.customerId),
    check("orders_totals_non_negative", sql`${table.totalCents} >= 0 and ${table.costCents} >= 0`),
    check("orders_items_count_positive", sql`${table.itemsCount} > 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // RESTRICT: un producto con ventas no se puede borrar (Requisito 10.4).
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    /** Precio y costo congelados al crear el pedido (Requisito 4.3). */
    unitPriceCents: integer("unit_price_cents").notNull(),
    unitCostCents: integer("unit_cost_cents").notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    index("order_items_product_id_idx").on(table.productId),
    check("order_items_quantity_positive", sql`${table.quantity} > 0`),
  ],
);

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
