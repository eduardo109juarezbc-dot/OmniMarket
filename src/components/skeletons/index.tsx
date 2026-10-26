import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { TableContainer } from "@/components/ui/table";
import { cn } from "@/lib/cn";

/**
 * Skeletons con la forma del contenido final (Requisito 13.1). Sin spinners:
 * la regla de ESLint del proyecto los prohíbe.
 */

export function KpiSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-3 pt-5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <div className="flex h-64 items-end gap-2">
          {[40, 65, 50, 80, 55, 90, 70, 60, 85, 45, 75, 95].map((height, i) => (
            <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${height}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({
  rows = 8,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <TableContainer className={className}>
      <div className="flex gap-4 bg-subtle px-4 py-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1 bg-[#d5d9de]" />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex gap-4 px-4 py-3.5">
            {Array.from({ length: columns }, (_, col) => (
              <Skeleton key={col} className={cn("h-4 flex-1", col === 0 && "max-w-24")} />
            ))}
          </div>
        ))}
      </div>
    </TableContainer>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-hidden">
      {Array.from({ length: 6 }, (_, col) => (
        <div
          key={col}
          className="flex min-w-40 flex-1 basis-0 flex-col gap-3 rounded-lg bg-subtle p-3"
        >
          <Skeleton className="h-4 w-28 bg-[#d5d9de]" />
          {Array.from({ length: 4 - (col % 2) }, (_, card) => (
            <div key={card} className="flex flex-col gap-2 rounded-md bg-surface p-3 shadow-sm">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Cargando métricas…" className="flex flex-col gap-6">
      <KpiSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartSkeleton className="lg:col-span-2" />
        <ChartSkeleton />
      </div>
      <TableSkeleton rows={10} columns={6} />
    </LoadingRegion>
  );
}
