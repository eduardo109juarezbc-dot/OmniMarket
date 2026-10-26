"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DashboardSkeleton } from "@/components/skeletons";
import { pollingInterval, useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { apiFetch } from "@/lib/api-client";
import type { DashboardDto, DashboardRange, SalesPageDto } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { KpiCards } from "./kpi-cards";
import { LiveIndicator } from "./live-indicator";
import { RevenueChart } from "./revenue-chart";
import { SalesTable } from "./sales-table";
import { StatusChart } from "./status-chart";

const RANGES: { value: DashboardRange; label: string }[] = [
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "all", label: "Todo" },
];

/**
 * Dashboard analítico (Requisito 9). Los datos iniciales llegan del servidor;
 * después se mantienen al día con Supabase Realtime o, si falla, con polling.
 */
export function DashboardView({
  initialDashboard,
  initialSales,
}: {
  initialDashboard: DashboardDto;
  initialSales: SalesPageDto;
}) {
  const live = useRealtimeOrders();
  const refetchInterval = pollingInterval(live);
  const [range, setRange] = useState<DashboardRange>(initialDashboard.range);

  const query = useQuery({
    queryKey: queryKeys.dashboard(range),
    queryFn: () => apiFetch<DashboardDto>("/api/analytics", { query: { range } }),
    initialData: range === initialDashboard.range ? initialDashboard : undefined,
    placeholderData: keepPreviousData,
    refetchInterval,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Periodo"
          className="inline-flex rounded-md border border-line bg-surface p-1"
        >
          {RANGES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
              className={cn(
                "rounded px-3 py-1.5 text-sm font-medium transition-colors",
                range === option.value ? "bg-brand text-white" : "text-muted hover:bg-subtle",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {query.data && (
            <span className="text-xs text-muted" data-testid="dashboard-updated">
              Actualizado a las {formatTime(query.data.generatedAt)}
            </span>
          )}
          <LiveIndicator status={live} />
        </div>
      </div>

      {query.isPending ? (
        <DashboardSkeleton />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-danger">
          No se pudieron cargar las métricas. Se reintentará automáticamente.
        </p>
      ) : (
        <div
          className={cn("flex flex-col gap-6", query.isPlaceholderData && "animate-pulse")}
          aria-busy={query.isPlaceholderData || undefined}
        >
          <KpiCards summary={query.data.summary} />
          <div className="grid gap-4 lg:grid-cols-3">
            <RevenueChart daily={query.data.daily} />
            <StatusChart ordersByStatus={query.data.summary.ordersByStatus} />
          </div>
        </div>
      )}

      <SalesTable initialData={initialSales} refetchInterval={refetchInterval} />
    </div>
  );
}
