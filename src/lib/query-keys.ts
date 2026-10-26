/**
 * Claves de TanStack Query. La primera posición agrupa por recurso, para
 * invalidar todas las variantes (página, filtros) de una vez.
 */
export const queryKeys = {
  dashboard: (range: string) => ["dashboard", range] as const,
  sales: (page: number, limit: number) => ["sales", page, limit] as const,
  orders: (filters: Record<string, unknown>) => ["orders", filters] as const,
  board: () => ["board"] as const,
  products: (filters: Record<string, unknown>) => ["products", filters] as const,
  customers: (q: string) => ["customers", q] as const,
} as const;

/** Recursos que dependen de los pedidos (los invalida Realtime y cualquier mutación). */
export const ORDER_DEPENDENT_KEYS = [["dashboard"], ["sales"], ["orders"], ["board"]] as const;
