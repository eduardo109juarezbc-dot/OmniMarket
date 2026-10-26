import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, lt, or, sql, type SQL } from "drizzle-orm";
import type { BoardDto, BoardCardDto, OrderDto, Paginated } from "@/lib/api-types";
import { formatOrderCode, ORDER_STATUSES } from "@/lib/domain";
import { pageMeta, pageOffset } from "@/lib/filters";
import { orderTotals } from "@/lib/finance";
import { fromCents } from "@/lib/format";
import { positionBetween } from "@/lib/kanban";
import type { OrderCreateInput, OrderListQuery } from "@/lib/schemas";
import type { Db } from "../db/client";
import { customers, orderItems, orders, products } from "../db/schema";
import { DomainError } from "../errors";
import { containsPattern, utcDayRange } from "../sql";

const orderColumns = {
  id: orders.id,
  code: orders.code,
  customerId: orders.customerId,
  customerName: customers.name,
  status: orders.status,
  itemsCount: orders.itemsCount,
  totalCents: orders.totalCents,
  createdAt: orders.createdAt,
  updatedAt: orders.updatedAt,
};

type OrderRow = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  status: OrderDto["status"];
  itemsCount: number;
  totalCents: number;
  createdAt: Date;
  updatedAt: Date;
};

function toOrderDto(row: OrderRow): OrderDto {
  return {
    id: row.id,
    code: row.code,
    customerId: row.customerId,
    customerName: row.customerName,
    status: row.status,
    itemsCount: row.itemsCount,
    total: fromCents(row.totalCents),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function orderFilters(query: OrderListQuery): SQL | undefined {
  const pattern = query.q ? containsPattern(query.q) : undefined;
  const { start, end } = utcDayRange(query.from, query.to);
  return and(
    query.status ? eq(orders.status, query.status) : undefined,
    pattern ? or(ilike(orders.code, pattern), ilike(customers.name, pattern)) : undefined,
    start ? gte(orders.createdAt, start) : undefined,
    end ? lt(orders.createdAt, end) : undefined,
  );
}

/** Listado de pedidos con cliente, filtros y paginación (Requisito 10.5). */
export async function listOrders(db: Db, query: OrderListQuery): Promise<Paginated<OrderDto>> {
  const where = orderFilters(query);
  const [rows, [count]] = await Promise.all([
    db
      .select(orderColumns)
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(where)
      .orderBy(desc(orders.createdAt), asc(orders.code))
      .limit(query.limit)
      .offset(pageOffset(query.page, query.limit)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(where),
  ]);
  return { data: rows.map(toOrderDto), meta: pageMeta(count?.total ?? 0, query.page, query.limit) };
}

/**
 * Alta de pedido (Requisito 10.6), en una transacción:
 * precios y costos se leen del catálogo en el servidor (el cliente solo envía
 * productos y cantidades), se congelan en las líneas, se calculan los totales
 * y el pedido entra al final de la columna "Pendiente" del Kanban.
 */
export async function createOrder(db: Db, input: OrderCreateInput): Promise<OrderDto> {
  return db.transaction(async (tx) => {
    const [customer] = await tx
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .where(eq(customers.id, input.customerId));
    if (!customer) {
      throw new DomainError(400, "VALIDATION_ERROR", "Los datos enviados no son válidos", [
        { path: "customerId", message: "El cliente no existe" },
      ]);
    }

    const productIds = input.items.map((item) => item.productId);
    const catalog = await tx
      .select({
        id: products.id,
        priceCents: products.priceCents,
        costCents: products.costCents,
        active: products.active,
      })
      .from(products)
      .where(inArray(products.id, productIds));
    const byId = new Map(catalog.map((product) => [product.id, product]));

    const issues = input.items.flatMap((item, index) => {
      const product = byId.get(item.productId);
      if (!product) return [{ path: `items.${index}.productId`, message: "El producto no existe" }];
      if (!product.active) {
        return [{ path: `items.${index}.productId`, message: "El producto está inactivo" }];
      }
      return [];
    });
    if (issues.length > 0) {
      throw new DomainError(400, "VALIDATION_ERROR", "Los datos enviados no son válidos", issues);
    }

    const lines = input.items.map((item) => {
      const product = byId.get(item.productId) as NonNullable<ReturnType<typeof byId.get>>;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        unitCostCents: product.costCents,
      };
    });
    const totals = orderTotals(lines);

    const [[sequence], [last]] = await Promise.all([
      tx.execute<{ value: string }>(sql`select nextval('public.order_code_seq') as value`),
      tx
        .select({ position: sql<number | null>`max(${orders.position})` })
        .from(orders)
        .where(eq(orders.status, "PENDING")),
    ]);

    const [order] = await tx
      .insert(orders)
      .values({
        // nextval devuelve bigint (texto en postgres-js).
        code: formatOrderCode(Number(sequence?.value)),
        customerId: customer.id,
        status: "PENDING",
        position: positionBetween(last?.position ?? null, null),
        ...totals,
      })
      .returning();
    if (!order) throw new Error("No se pudo crear el pedido");

    await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));

    return toOrderDto({ ...order, customerName: customer.name });
  });
}

/** Tablero Kanban: pedidos agrupados por columna y ordenados por posición. */
export async function getBoard(db: Db): Promise<BoardDto> {
  const rows = await db
    .select({
      id: orders.id,
      code: orders.code,
      customerName: customers.name,
      status: orders.status,
      position: orders.position,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    })
    .from(orders)
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .orderBy(asc(orders.status), asc(orders.position), asc(orders.id));

  const columns = Object.fromEntries(
    ORDER_STATUSES.map((status) => [status, [] as BoardCardDto[]]),
  ) as BoardDto["columns"];
  for (const row of rows) {
    columns[row.status].push({
      id: row.id,
      code: row.code,
      customerName: row.customerName,
      status: row.status,
      position: row.position,
      total: fromCents(row.totalCents),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });
  }
  return { columns, generatedAt: new Date().toISOString() };
}
