"use client";

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardDto } from "@/lib/api-types";
import { formatCompactMoney, formatDayMonth, formatMoney } from "@/lib/format";

/** Ingresos por día (Requisito 9.2). */
export function RevenueChart({ daily }: { daily: DashboardDto["daily"] }) {
  const total = daily.reduce((sum, day) => sum + day.revenue, 0);
  const best = daily.reduce<DashboardDto["daily"][number] | null>(
    (top, day) => (!top || day.revenue > top.revenue ? day : top),
    null,
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Ingresos por día</CardTitle>
        <CardDescription>
          {daily.length} días con ventas · {formatMoney(total)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <figure>
          <AreaChart
            responsive
            style={{ width: "100%", height: 260 }}
            data={daily}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4338ca" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#4338ca" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#dde1e6" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(value: string) => formatDayMonth(value)}
              tick={{ fill: "#4b5563", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "#dde1e6" }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(value: number) => formatCompactMoney(value)}
              tick={{ fill: "#4b5563", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip
              formatter={(value) => [formatMoney(Number(value)), "Ingresos"]}
              labelFormatter={(label) => formatDayMonth(String(label))}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Ingresos"
              stroke="#4338ca"
              strokeWidth={2}
              fill="url(#revenue-fill)"
              isAnimationActive={false}
            />
          </AreaChart>
          <figcaption className="sr-only">
            Ingresos diarios: total {formatMoney(total)}
            {best
              ? `; mejor día ${formatDayMonth(best.date)} con ${formatMoney(best.revenue)}`
              : ""}
            .
          </figcaption>
        </figure>
      </CardContent>
    </Card>
  );
}
