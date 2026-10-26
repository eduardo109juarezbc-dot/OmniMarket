"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { TableSkeleton } from "@/components/skeletons";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkUpdate } from "@/hooks/use-bulk-update";
import { useRowSelection } from "@/hooks/use-row-selection";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TableContainer, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useDebouncedValue, useSyncUrlQuery } from "@/hooks/use-debounced-value";
import { apiFetch } from "@/lib/api-client";
import type { OrderDto, Paginated } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/domain";
import { formatDate, formatMoney } from "@/lib/format";
import { ORDERS_PAGE_SIZE } from "@/lib/page-sizes";
import { queryKeys } from "@/lib/query-keys";
import { StatusBadge } from "./status-badge";

export type OrderFiltersState = {
  page: number;
  q: string;
  status: OrderStatus | "";
  from: string;
  to: string;
};

/** Pedidos con búsqueda, filtros por estado y fechas, y paginación (Requisito 10.5). */
export function OrdersView({
  initialFilters,
  initialData,
  highlightCode,
}: {
  initialFilters: OrderFiltersState;
  initialData: Paginated<OrderDto>;
  /** Pedido recién creado, resaltado en la tabla. */
  highlightCode?: string;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const q = useDebouncedValue(filters.q.trim());
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to);
  const query = {
    page: filters.page,
    q,
    status: filters.status,
    from: filters.from,
    to: invalidRange ? "" : filters.to,
  };
  useSyncUrlQuery({ ...query, page: filters.page > 1 ? filters.page : undefined });

  const isInitial = JSON.stringify({ ...filters, q }) === JSON.stringify(initialFilters);
  const orders = useQuery({
    queryKey: queryKeys.orders(query),
    queryFn: () =>
      apiFetch<Paginated<OrderDto>>("/api/orders", {
        query: { ...query, limit: ORDERS_PAGE_SIZE },
      }),
    initialData: isInitial ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  const update = (patch: Partial<OrderFiltersState>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }));

  const rows = useMemo(() => orders.data?.data ?? [], [orders.data]);
  const selection = useRowSelection(
    rows.map((row) => row.id),
    JSON.stringify(query),
  );
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("SHIPPED");
  const bulk = useBulkUpdate<OrderDto, { ids: string[]; status: OrderStatus }>({
    endpoint: "/api/orders/bulk",
    queryKey: ["orders"],
    alsoInvalidate: [["dashboard"], ["sales"], ["board"]],
    apply: (row, { status }) => ({ ...row, status }),
    successMessage: ({ updated }, { status }) =>
      `${updated} ${updated === 1 ? "pedido actualizado" : "pedidos actualizados"} a "${ORDER_STATUS_LABELS[status]}"`,
  });
  const applyBulk = () => {
    bulk.mutate({ ids: [...selection.selected], status: bulkStatus });
    selection.clear();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm font-medium">
          Buscar
          <Input
            type="search"
            placeholder="Código o cliente"
            value={filters.q}
            onChange={(event) => update({ q: event.target.value })}
            data-testid="orders-search"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Estado
          <Select
            value={filters.status}
            onChange={(event) =>
              update({ status: event.target.value as OrderFiltersState["status"] })
            }
          >
            <option value="">Todos</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Desde
          <Input
            type="date"
            value={filters.from}
            onChange={(event) => update({ from: event.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Hasta
          <Input
            type="date"
            value={filters.to}
            aria-invalid={invalidRange || undefined}
            aria-describedby={invalidRange ? "orders-range-error" : undefined}
            onChange={(event) => update({ to: event.target.value })}
          />
        </label>
        <Link
          href="/orders/new"
          className={cn(buttonClasses("primary"), "ml-auto")}
          data-testid="new-order"
        >
          Nuevo pedido
        </Link>
      </div>
      {invalidRange && (
        <p id="orders-range-error" role="alert" className="text-sm text-danger">
          La fecha inicial no puede ser posterior a la final; se ignora la fecha final.
        </p>
      )}

      {orders.isPending ? (
        <TableSkeleton rows={10} columns={6} />
      ) : orders.isError ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar los pedidos. Inténtalo de nuevo.
        </p>
      ) : (
        <>
          <TableContainer
            aria-busy={orders.isPlaceholderData || undefined}
            className={cn(orders.isPlaceholderData && "animate-pulse")}
          >
            <Table data-testid="orders-table">
              <caption className="sr-only">Pedidos, más recientes primero</caption>
              <THead>
                <TR>
                  <TH className="w-10">
                    <Checkbox
                      aria-label="Seleccionar todos los pedidos de la página"
                      checked={selection.allSelected}
                      indeterminate={selection.someSelected}
                      onChange={selection.toggleAll}
                      data-testid="select-all-orders"
                    />
                  </TH>
                  <TH>Pedido</TH>
                  <TH>Cliente</TH>
                  <TH aria-sort="descending">Fecha</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Artículos</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {orders.data.data.length === 0 && (
                  <TR>
                    <TD colSpan={7} className="py-8 text-center text-muted">
                      No hay pedidos que coincidan con los filtros.
                    </TD>
                  </TR>
                )}
                {orders.data.data.map((order) => (
                  <TR
                    key={order.id}
                    data-testid={`order-row-${order.code}`}
                    aria-selected={selection.isSelected(order.id)}
                    className={cn(order.code === highlightCode && "bg-brand-soft")}
                  >
                    <TD>
                      <Checkbox
                        aria-label={`Seleccionar ${order.code}`}
                        checked={selection.isSelected(order.id)}
                        onChange={() => selection.toggle(order.id)}
                      />
                    </TD>
                    <TD className="font-medium">{order.code}</TD>
                    <TD>{order.customerName}</TD>
                    <TD className="whitespace-nowrap text-muted">{formatDate(order.createdAt)}</TD>
                    <TD>
                      <StatusBadge status={order.status} />
                    </TD>
                    <TD className="text-right tabular-nums">{order.itemsCount}</TD>
                    <TD className="text-right tabular-nums">{formatMoney(order.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableContainer>
          <Pagination
            meta={orders.data.meta}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
            pending={orders.isFetching && orders.isPlaceholderData}
            label="pedidos"
          />
        </>
      )}

      <BulkActionBar count={selection.count} noun="pedidos" onClear={selection.clear}>
        <label className="flex items-center gap-2 text-sm">
          Cambiar estado a
          <Select
            className="h-9 w-44"
            value={bulkStatus}
            onChange={(event) => setBulkStatus(event.target.value as OrderStatus)}
            data-testid="bulk-status"
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </label>
        <Button size="sm" onClick={applyBulk} pending={bulk.isPending} data-testid="bulk-apply">
          Aplicar
        </Button>
      </BulkActionBar>
    </div>
  );
}
