"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StatusBadge } from "@/components/orders/status-badge";
import { TableSkeleton } from "@/components/skeletons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableContainer, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { apiFetch } from "@/lib/api-client";
import type { SalesPageDto } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { SALES_PAGE_SIZE } from "@/lib/page-sizes";

/** Tabla de ventas paginada (Requisito 9.3). */
export function SalesTable({
  initialData,
  refetchInterval,
}: {
  initialData: SalesPageDto;
  refetchInterval: number | false;
}) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: queryKeys.sales(page, SALES_PAGE_SIZE),
    queryFn: () =>
      apiFetch<SalesPageDto>("/api/analytics/sales", { query: { page, limit: SALES_PAGE_SIZE } }),
    initialData: page === 1 ? initialData : undefined,
    placeholderData: keepPreviousData,
    refetchInterval,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por pedido</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {query.isPending ? (
          <TableSkeleton rows={SALES_PAGE_SIZE} columns={6} />
        ) : query.isError ? (
          <p role="alert" className="text-sm text-danger">
            No se pudieron cargar las ventas. Se reintentará automáticamente.
          </p>
        ) : (
          <>
            <TableContainer
              aria-busy={query.isPlaceholderData || undefined}
              className={cn(query.isPlaceholderData && "animate-pulse")}
            >
              <Table data-testid="sales-table">
                <caption className="sr-only">Ventas por pedido, más recientes primero</caption>
                <THead>
                  <TR>
                    <TH>Pedido</TH>
                    <TH>Fecha</TH>
                    <TH>Estado</TH>
                    <TH className="text-right">Ingresos</TH>
                    <TH className="text-right">Costo</TH>
                    <TH className="text-right">Margen</TH>
                  </TR>
                </THead>
                <TBody>
                  {query.data.data.map((row) => (
                    <TR key={row.orderId}>
                      <TD className="font-medium">{row.code}</TD>
                      <TD className="whitespace-nowrap text-muted">{formatDate(row.createdAt)}</TD>
                      <TD>
                        <StatusBadge status={row.status} />
                      </TD>
                      <TD className="text-right tabular-nums">{formatMoney(row.revenue)}</TD>
                      <TD className="text-right text-muted tabular-nums">
                        {formatMoney(row.cost)}
                      </TD>
                      <TD className="text-right tabular-nums">
                        {formatMoney(row.margin)}{" "}
                        <span className="text-xs text-muted">({formatPercent(row.marginPct)})</span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableContainer>
            <Pagination
              meta={query.data.meta}
              onPageChange={setPage}
              pending={query.isFetching && query.isPlaceholderData}
              label="pedidos"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
