import { Card, CardContent } from "@/components/ui/card";
import type { SalesSummaryDto } from "@/lib/api-types";
import { appConfig } from "@/lib/config";
import { formatMoney, formatPercent } from "@/lib/format";

/** Tarjetas KPI del dashboard (Requisito 9.1). */
export function KpiCards({ summary }: { summary: SalesSummaryDto }) {
  const cancelled = summary.ordersByStatus.CANCELLED;
  const items = [
    {
      id: "revenue",
      label: "Ingresos",
      value: formatMoney(summary.totalRevenue),
      hint: "Sin pedidos cancelados",
    },
    {
      id: "orders",
      label: "Pedidos",
      value: summary.totalOrders.toLocaleString(appConfig.locale),
      hint: `${cancelled} cancelados aparte`,
    },
    {
      id: "average-ticket",
      label: "Ticket promedio",
      value: formatMoney(summary.averageTicket),
      hint: "Ingresos ÷ pedidos",
    },
    {
      id: "gross-margin",
      label: "Margen bruto",
      value: formatMoney(summary.grossMargin),
      hint: `${formatPercent(summary.marginPct)} sobre ingresos`,
    },
  ];

  return (
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.id} data-testid={`kpi-${item.id}`}>
          <CardContent className="flex flex-col gap-1 pt-5">
            <dt className="text-sm font-medium text-muted">{item.label}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{item.value}</dd>
            <dd className="text-xs text-muted">{item.hint}</dd>
          </CardContent>
        </Card>
      ))}
    </dl>
  );
}
