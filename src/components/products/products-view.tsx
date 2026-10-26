"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { TableSkeleton } from "@/components/skeletons";
import { Badge } from "@/components/ui/badge";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkUpdate } from "@/hooks/use-bulk-update";
import { useRowSelection } from "@/hooks/use-row-selection";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TableContainer, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useDebouncedValue, useSyncUrlQuery } from "@/hooks/use-debounced-value";
import { isTempId } from "@/hooks/optimistic";
import { apiFetch } from "@/lib/api-client";
import type { Paginated, ProductDto } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import { PRODUCT_CATEGORIES, PRODUCT_CATEGORY_LABELS, type ProductCategory } from "@/lib/domain";
import { formatMoney, formatPercent } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { PRODUCTS_PAGE_SIZE } from "@/lib/page-sizes";
import { DeleteProductDialog } from "./delete-product-dialog";
import { ProductFormDialog } from "./product-form-dialog";

export type ProductFiltersState = {
  page: number;
  q: string;
  category: ProductCategory | "";
  active: "" | "true" | "false";
};

/** Catálogo con búsqueda, filtros sincronizados con la URL y paginación (Requisito 10.1). */
export function ProductsView({
  initialFilters,
  initialData,
}: {
  initialFilters: ProductFiltersState;
  initialData: Paginated<ProductDto>;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const q = useDebouncedValue(filters.q.trim());
  const query = { page: filters.page, q, category: filters.category, active: filters.active };
  const listKey = queryKeys.products(query);
  useSyncUrlQuery({ ...query, page: filters.page > 1 ? filters.page : undefined });

  const isInitial =
    JSON.stringify(filters) === JSON.stringify(initialFilters) && q === initialFilters.q;
  const products = useQuery({
    queryKey: listKey,
    queryFn: () =>
      apiFetch<Paginated<ProductDto>>("/api/products", {
        query: { ...query, limit: PRODUCTS_PAGE_SIZE },
      }),
    initialData: isInitial ? initialData : undefined,
    placeholderData: keepPreviousData,
  });

  const [editing, setEditing] = useState<ProductDto | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProductDto | null>(null);

  const update = (patch: Partial<ProductFiltersState>) =>
    setFilters((current) => ({ ...current, page: 1, ...patch }));

  const rows = useMemo(() => products.data?.data ?? [], [products.data]);
  const selection = useRowSelection(
    rows.filter((row) => !isTempId(row.id)).map((row) => row.id),
    JSON.stringify(query),
  );
  const [bulkCategory, setBulkCategory] = useState<ProductCategory>("ELECTRONICS");
  type BulkVars = { ids: string[]; patch: { active?: boolean; category?: ProductCategory } };
  const bulk = useBulkUpdate<ProductDto, BulkVars>({
    endpoint: "/api/products/bulk",
    queryKey: ["products"],
    apply: (row, { patch }) => ({ ...row, ...patch }),
    successMessage: ({ updated }, { patch }) => {
      const what =
        patch.active === true
          ? "activados"
          : patch.active === false
            ? "desactivados"
            : `movidos a ${PRODUCT_CATEGORY_LABELS[patch.category as ProductCategory]}`;
      return `${updated} ${updated === 1 ? "producto" : "productos"} ${what}`;
    },
  });
  const applyBulk = (patch: BulkVars["patch"]) => {
    bulk.mutate({ ids: [...selection.selected], patch });
    selection.clear();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm font-medium">
          Buscar
          <Input
            type="search"
            placeholder="Nombre o SKU"
            value={filters.q}
            onChange={(event) => update({ q: event.target.value })}
            data-testid="products-search"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Categoría
          <Select
            value={filters.category}
            onChange={(event) =>
              update({ category: event.target.value as ProductFiltersState["category"] })
            }
          >
            <option value="">Todas</option>
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {PRODUCT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Estado
          <Select
            value={filters.active}
            onChange={(event) =>
              update({ active: event.target.value as ProductFiltersState["active"] })
            }
          >
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </Select>
        </label>
        <Button
          className="ml-auto"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          data-testid="new-product"
        >
          Nuevo producto
        </Button>
      </div>

      {products.isPending ? (
        <TableSkeleton rows={10} columns={8} />
      ) : products.isError ? (
        <p role="alert" className="text-sm text-danger">
          No se pudo cargar el catálogo. Inténtalo de nuevo.
        </p>
      ) : (
        <>
          <TableContainer
            aria-busy={products.isPlaceholderData || undefined}
            className={cn(products.isPlaceholderData && "animate-pulse")}
          >
            <Table data-testid="products-table">
              <caption className="sr-only">Productos del catálogo, más recientes primero</caption>
              <THead>
                <TR>
                  <TH className="w-10">
                    <Checkbox
                      aria-label="Seleccionar todos los productos de la página"
                      checked={selection.allSelected}
                      indeterminate={selection.someSelected}
                      onChange={selection.toggleAll}
                      data-testid="select-all-products"
                    />
                  </TH>
                  <TH>SKU</TH>
                  <TH>Nombre</TH>
                  <TH>Categoría</TH>
                  <TH className="text-right">Precio</TH>
                  <TH className="text-right">Costo</TH>
                  <TH className="text-right">Margen</TH>
                  <TH className="text-right">Stock</TH>
                  <TH>Estado</TH>
                  <TH>
                    <span className="sr-only">Acciones</span>
                  </TH>
                </TR>
              </THead>
              <TBody>
                {products.data.data.length === 0 && (
                  <TR>
                    <TD colSpan={10} className="py-8 text-center text-muted">
                      No hay productos que coincidan con los filtros.
                    </TD>
                  </TR>
                )}
                {products.data.data.map((product) => {
                  const pending = isTempId(product.id);
                  return (
                    <TR
                      key={product.id}
                      data-testid={`product-row-${product.sku}`}
                      aria-busy={pending || undefined}
                      aria-selected={selection.isSelected(product.id)}
                      className={cn(pending && "animate-pulse opacity-70")}
                    >
                      <TD>
                        <Checkbox
                          aria-label={`Seleccionar ${product.sku}`}
                          checked={selection.isSelected(product.id)}
                          disabled={pending}
                          onChange={() => selection.toggle(product.id)}
                        />
                      </TD>
                      <TD className="font-mono text-xs">{product.sku}</TD>
                      <TD className="font-medium">{product.name}</TD>
                      <TD className="text-muted">{PRODUCT_CATEGORY_LABELS[product.category]}</TD>
                      <TD className="text-right tabular-nums">{formatMoney(product.price)}</TD>
                      <TD className="text-right text-muted tabular-nums">
                        {formatMoney(product.cost)}
                      </TD>
                      <TD className="text-right tabular-nums">
                        {formatPercent(product.marginPct)}
                      </TD>
                      <TD className="text-right tabular-nums">{product.stock}</TD>
                      <TD>
                        <Badge tone={product.active ? "success" : "neutral"}>
                          {product.active ? "Activo" : "Inactivo"}
                        </Badge>
                      </TD>
                      <TD className="whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={pending}
                            aria-label={`Editar ${product.sku}`}
                            onClick={() => {
                              setEditing(product);
                              setFormOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-danger"
                            disabled={pending}
                            aria-label={`Eliminar ${product.sku}`}
                            onClick={() => setDeleting(product)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableContainer>
          <Pagination
            meta={products.data.meta}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
            pending={products.isFetching && products.isPlaceholderData}
            label="productos"
          />
        </>
      )}

      <BulkActionBar count={selection.count} noun="productos" onClear={selection.clear}>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => applyBulk({ active: true })}
          data-testid="bulk-activate"
        >
          Activar
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => applyBulk({ active: false })}
          data-testid="bulk-deactivate"
        >
          Desactivar
        </Button>
        <label className="flex items-center gap-2 text-sm">
          Categoría
          <Select
            className="h-9 w-40"
            value={bulkCategory}
            onChange={(event) => setBulkCategory(event.target.value as ProductCategory)}
          >
            {PRODUCT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {PRODUCT_CATEGORY_LABELS[category]}
              </option>
            ))}
          </Select>
        </label>
        <Button
          size="sm"
          onClick={() => applyBulk({ category: bulkCategory })}
          pending={bulk.isPending}
        >
          Cambiar categoría
        </Button>
      </BulkActionBar>

      <ProductFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        listKey={listKey}
      />
      <DeleteProductDialog product={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
