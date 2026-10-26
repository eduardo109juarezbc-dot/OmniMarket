import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ProductsView, type ProductFiltersState } from "@/components/products/products-view";
import { TableSkeleton } from "@/components/skeletons";
import { LoadingRegion } from "@/components/ui/skeleton";
import { PRODUCTS_PAGE_SIZE } from "@/lib/page-sizes";
import { productListQuerySchema } from "@/lib/schemas";
import { getSessionUser } from "@/server/auth";
import { getDb } from "@/server/db/client";
import { listProducts } from "@/server/services/products";

export const metadata: Metadata = { title: "Productos" };

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <PageHeader title="Productos" description="Gestiona el catálogo: alta, edición y bajas." />
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsData searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function ProductsSkeleton() {
  return (
    <LoadingRegion label="Cargando productos…">
      <TableSkeleton rows={10} columns={8} />
    </LoadingRegion>
  );
}

async function ProductsData({ searchParams }: Pick<PageProps<"/products">, "searchParams">) {
  if (!(await getSessionUser())) redirect("/login");
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );
  // Filtros inválidos en la URL se ignoran (se muestran los valores por defecto).
  const parsed = productListQuerySchema.safeParse({ ...params, limit: String(PRODUCTS_PAGE_SIZE) });
  const query = parsed.success
    ? parsed.data
    : productListQuerySchema.parse({ limit: String(PRODUCTS_PAGE_SIZE) });

  const filters: ProductFiltersState = {
    page: query.page,
    q: query.q ?? "",
    category: query.category ?? "",
    active: query.active === undefined ? "" : query.active ? "true" : "false",
  };
  return <ProductsView initialFilters={filters} initialData={await listProducts(getDb(), query)} />;
}
