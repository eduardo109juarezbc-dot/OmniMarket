import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { OrdersView, type OrderFiltersState } from "@/components/orders/orders-view";
import { TableSkeleton } from "@/components/skeletons";
import { LoadingRegion } from "@/components/ui/skeleton";
import { ORDER_CODE_PATTERN } from "@/lib/domain";
import { ORDERS_PAGE_SIZE } from "@/lib/page-sizes";
import { orderListQuerySchema } from "@/lib/schemas";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { listOrders } from "@/server/services/orders";

export const metadata: Metadata = { title: "Pedidos" };

export default function OrdersPage({ searchParams }: PageProps<"/orders">) {
  return (
    <>
      <PageHeader title="Pedidos" description="Consulta, filtra y crea pedidos." />
      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersData searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function OrdersSkeleton() {
  return (
    <LoadingRegion label="Cargando pedidos…">
      <TableSkeleton rows={10} columns={6} />
    </LoadingRegion>
  );
}

async function OrdersData({ searchParams }: Pick<PageProps<"/orders">, "searchParams">) {
  if (!(await getSessionUser())) redirect("/login");
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  const { created, ...filterParams } = params;
  const limit = String(ORDERS_PAGE_SIZE);
  const parsed = orderListQuerySchema.safeParse({ ...filterParams, limit });
  const query = parsed.success ? parsed.data : orderListQuerySchema.parse({ limit });

  const filters: OrderFiltersState = {
    page: query.page,
    q: query.q ?? "",
    status: query.status ?? "",
    from: query.from ?? "",
    to: query.to ?? "",
  };
  const highlightCode = created && ORDER_CODE_PATTERN.test(created) ? created : undefined;
  return (
    <OrdersView
      initialFilters={filters}
      initialData={await listOrders(getDb(), query)}
      highlightCode={highlightCode}
    />
  );
}
