import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { OrderForm } from "@/components/orders/order-form";
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { listCustomers } from "@/server/services/customers";
import { listProducts } from "@/server/services/products";

export const metadata: Metadata = { title: "Nuevo pedido" };

export default function NewOrderPage() {
  return (
    <>
      <PageHeader
        title="Nuevo pedido"
        description="El pedido entra en la columna Pendiente del Kanban."
      />
      <Suspense fallback={<OrderFormSkeleton />}>
        <OrderFormData />
      </Suspense>
    </>
  );
}

function OrderFormSkeleton() {
  return (
    <LoadingRegion label="Cargando formulario…" className="flex max-w-3xl flex-col gap-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-40" />
    </LoadingRegion>
  );
}

async function OrderFormData() {
  if (!(await getSessionUser())) redirect("/login");
  const db = getDb();
  const [customers, products] = await Promise.all([
    listCustomers(db, { q: undefined }),
    listProducts(db, { page: 1, limit: 100, q: undefined, active: true }),
  ]);
  return <OrderForm customers={customers} products={products.data} />;
}
