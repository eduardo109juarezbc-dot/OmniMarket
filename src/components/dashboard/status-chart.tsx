"use client";

import { Bar, BarChart, Cell, Tooltip, XAxis, YAxis } from "recharts";
import { STATUS_STYLE } from "@/components/orders/status-style";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SalesSummaryDto } from "@/lib/api-types";
import { STATUS_COLUMNS } from "@/lib/kanban";

/** Pedidos por estado (Requisito 9.2). Incluye los cancelados. */
export function StatusChart({
  ordersByStatus,
}: {
  ordersByStatus: SalesSummaryDto["ordersByStatus"];
}) {
  const data = STATUS_COLUMNS.map((column) => ({
    status: column.status,
    label: column.label,
    count: ordersByStatus[column.status],
  }));
  const total = data.reduce((sum, row) => sum + row.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos por estado</CardTitle>
        <CardDescription>{total} pedidos en total</CardDescription>
      </CardHeader>
      <CardContent>
        <figure>
          <BarChart
            responsive
            layout="vertical"
            style={{ width: "100%", height: 260 }}
            data={data}
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
          >
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={96}
              tick={{ fill: "#4b5563", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value) => [String(value), "Pedidos"]}
              cursor={{ fill: "#eef0f3" }}
            />
            <Bar dataKey="count" name="Pedidos" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {data.map((row) => (
                <Cell key={row.status} fill={STATUS_STYLE[row.status].color} />
              ))}
            </Bar>
          </BarChart>
          <figcaption className="sr-only">
            {data.map((row) => `${row.label}: ${row.count}`).join("; ")}.
          </figcaption>
        </figure>
      </CardContent>
    </Card>
  );
}
