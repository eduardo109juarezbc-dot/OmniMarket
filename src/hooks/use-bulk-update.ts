"use client";

import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { BulkResultDto, Paginated } from "@/lib/api-types";
import { restoreSnapshot, snapshotQueries, type Snapshot } from "./optimistic";

type BulkOptions<TRow extends { id: string }, TVars extends { ids: string[] }> = {
  endpoint: string;
  /** Raíz de las queries de la tabla (todas sus páginas reciben el cambio optimista). */
  queryKey: QueryKey;
  /** Otras queries a refrescar al terminar (dashboard, tablero…). */
  alsoInvalidate?: QueryKey[];
  apply: (row: TRow, vars: TVars) => TRow;
  successMessage: (result: BulkResultDto, vars: TVars) => string;
};

/**
 * Edición en lote con mutación optimista (Requisitos 12.4–12.6): todas las
 * filas afectadas cambian al instante en todas las páginas en caché; si el
 * servidor falla, se restauran todas y se muestra un toast de error.
 */
export function useBulkUpdate<TRow extends { id: string }, TVars extends { ids: string[] }>(
  options: BulkOptions<TRow, TVars>,
) {
  const queryClient = useQueryClient();
  return useMutation<BulkResultDto, unknown, TVars, { snapshot: Snapshot }>({
    mutationFn: (vars) =>
      apiFetch<BulkResultDto>(options.endpoint, { method: "PATCH", json: vars }),
    onMutate: async (vars) => {
      const snapshot = await snapshotQueries(queryClient, options.queryKey);
      const ids = new Set(vars.ids);
      queryClient.setQueriesData<Paginated<TRow>>({ queryKey: options.queryKey }, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((row) => (ids.has(row.id) ? options.apply(row, vars) : row)),
            }
          : old,
      );
      return { snapshot };
    },
    onError: (error, vars, context) => {
      restoreSnapshot(queryClient, context?.snapshot);
      const reason = error instanceof ApiError && error.status !== 0 ? `: ${error.message}` : "";
      toast.error(
        `No se pudieron actualizar los ${vars.ids.length} registros. Se restauraron los valores${reason}`,
      );
    },
    onSuccess: (result, vars) => toast.success(options.successMessage(result, vars)),
    onSettled: async () => {
      for (const queryKey of [options.queryKey, ...(options.alsoInvalidate ?? [])]) {
        await queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
