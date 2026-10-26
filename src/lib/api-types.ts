/**
 * Contratos JSON de la API privada (/api/*), compartidos por los Route Handlers
 * y los hooks del cliente. Los importes van en unidades mayores (p. ej. 19.99).
 */
import type { PageMeta } from "./filters";
import type { OrderStatus, ProductCategory } from "./domain";

export type Paginated<T> = { data: T[]; meta: PageMeta };

export type ProductDto = {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  cost: number;
  stock: number;
  active: boolean;
  marginPct: number;
  updatedAt: string;
};

export type OrderDto = {
  id: string;
  code: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  itemsCount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

/** Tarjeta del tablero Kanban. `position` es la posición fraccional persistida. */
export type BoardCardDto = {
  id: string;
  code: string;
  customerName: string;
  status: OrderStatus;
  position: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * `generatedAt` es la referencia para la antigüedad de las tarjetas: al venir
 * del servidor, el HTML del servidor y el del cliente coinciden al hidratar.
 */
export type BoardDto = { columns: Record<OrderStatus, BoardCardDto[]>; generatedAt: string };

export type CustomerOptionDto = { id: string; name: string; city: string };

export type SalesSummaryDto = {
  currency: string;
  totalRevenue: number;
  totalOrders: number;
  averageTicket: number;
  grossMargin: number;
  marginPct: number;
  ordersByStatus: Record<OrderStatus, number>;
};

/** Venta por pedido (tabla del dashboard y /api/test/analytics). Sin datos personales. */
export type SaleRowDto = {
  orderId: string;
  code: string;
  createdAt: string;
  status: OrderStatus;
  itemsCount: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
};

export type SalesPageDto = { summary: SalesSummaryDto; data: SaleRowDto[]; meta: PageMeta };

export type DashboardRange = "30d" | "90d" | "all";

export type DashboardDto = {
  range: DashboardRange;
  summary: SalesSummaryDto;
  /** Serie diaria (UTC) de ingresos y pedidos no cancelados. */
  daily: { date: string; revenue: number; orders: number }[];
  generatedAt: string;
};

export type MoveResultDto = {
  id: string;
  status: OrderStatus;
  position: number;
  updatedAt: string;
};

export type BulkResultDto = { updated: number };

export type ApiErrorBody = {
  error: { code: string; message: string; details?: { path: string; message: string }[] };
};
