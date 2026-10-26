"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { Paginated, ProductDto } from "@/lib/api-types";
import { marginPct } from "@/lib/finance";
import { toCents } from "@/lib/format";
import type { ProductCreateInput, ProductUpdateInput } from "@/lib/schemas";
import { restoreSnapshot, snapshotQueries, tempId, type Snapshot } from "./optimistic";

const PRODUCTS_KEY = ["products"] as const;

type ProductPages = Paginated<ProductDto>;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function optimisticProduct(input: ProductCreateInput, id: string): ProductDto {
  return {
    id,
    sku: input.sku,
    name: input.name,
    category: input.category,
    price: input.price,
    cost: input.cost,
    stock: input.stock,
    active: input.active,
    marginPct: marginPct(toCents(input.price), toCents(input.cost)),
    updatedAt: new Date().toISOString(),
  };
}

/** Alta de producto: aparece al inicio de la tabla visible antes de la respuesta. */
export function useCreateProduct(listKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  return useMutation<ProductDto, unknown, ProductCreateInput, { snapshot: Snapshot }>({
    mutationFn: (input) => apiFetch<ProductDto>("/api/products", { method: "POST", json: input }),
    onMutate: async (input) => {
      const snapshot = await snapshotQueries(queryClient, PRODUCTS_KEY);
      queryClient.setQueryData<ProductPages>(listKey, (old) =>
        old
          ? {
              data: [optimisticProduct(input, tempId()), ...old.data],
              meta: { ...old.meta, total: old.meta.total + 1 },
            }
          : old,
      );
      return { snapshot };
    },
    onError: (error, _input, context) => {
      restoreSnapshot(queryClient, context?.snapshot);
      // Los errores por campo (p. ej. SKU repetido) los muestra el formulario.
      if (!(error instanceof ApiError && error.details.length > 0)) {
        toast.error(errorMessage(error, "No se pudo crear el producto. Se descartó el cambio."));
      }
    },
    onSuccess: (product) => toast.success(`Producto ${product.sku} creado`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

/** Edición: el cambio se ve en todas las páginas en caché al instante. */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation<
    ProductDto,
    unknown,
    { id: string; patch: ProductUpdateInput; silent?: boolean },
    { snapshot: Snapshot }
  >({
    mutationFn: ({ id, patch }) =>
      apiFetch<ProductDto>(`/api/products/${id}`, { method: "PATCH", json: patch }),
    onMutate: async ({ id, patch }) => {
      const snapshot = await snapshotQueries(queryClient, PRODUCTS_KEY);
      queryClient.setQueriesData<ProductPages>({ queryKey: PRODUCTS_KEY }, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((product) => {
                if (product.id !== id) return product;
                const next = { ...product, ...patch };
                return { ...next, marginPct: marginPct(toCents(next.price), toCents(next.cost)) };
              }),
            }
          : old,
      );
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      restoreSnapshot(queryClient, context?.snapshot);
      if (!(error instanceof ApiError && error.details.length > 0)) {
        toast.error(
          errorMessage(error, "No se pudo guardar el producto. Se restauraron los datos."),
        );
      }
    },
    onSuccess: (product, { silent }) => {
      if (!silent) toast.success(`Producto ${product.sku} actualizado`);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}

/**
 * Baja: la fila desaparece al instante. Si el producto tiene ventas (409), se
 * restaura y el toast ofrece desactivarlo (Requisito 10.4).
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const update = useUpdateProduct();
  return useMutation<void, unknown, ProductDto, { snapshot: Snapshot }>({
    mutationFn: (product) => apiFetch<void>(`/api/products/${product.id}`, { method: "DELETE" }),
    onMutate: async (product) => {
      const snapshot = await snapshotQueries(queryClient, PRODUCTS_KEY);
      queryClient.setQueriesData<ProductPages>({ queryKey: PRODUCTS_KEY }, (old) =>
        old
          ? {
              data: old.data.filter((row) => row.id !== product.id),
              meta: { ...old.meta, total: Math.max(0, old.meta.total - 1) },
            }
          : old,
      );
      return { snapshot };
    },
    onError: (error, product, context) => {
      restoreSnapshot(queryClient, context?.snapshot);
      if (error instanceof ApiError && error.code === "PRODUCT_IN_USE") {
        toast.error(error.message, {
          action: product.active
            ? {
                label: "Desactivar",
                onClick: () =>
                  update.mutate(
                    { id: product.id, patch: { active: false }, silent: true },
                    { onSuccess: () => toast.success(`Producto ${product.sku} desactivado`) },
                  ),
              }
            : undefined,
        });
        return;
      }
      toast.error(errorMessage(error, "No se pudo eliminar el producto. Se restauró la fila."));
    },
    onSuccess: (_data, product) => toast.success(`Producto ${product.sku} eliminado`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: PRODUCTS_KEY }),
  });
}
