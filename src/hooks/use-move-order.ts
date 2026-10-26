"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { BoardDto, MoveResultDto } from "@/lib/api-types";
import type { OrderStatus } from "@/lib/domain";
import { applyMove, statusLabel } from "@/lib/kanban";
import { ORDER_DEPENDENT_KEYS, queryKeys } from "@/lib/query-keys";

export type MoveVariables = { id: string; code: string; toStatus: OrderStatus; toIndex: number };

/**
 * Movimiento optimista en el Kanban (Requisitos 11.4–11.7):
 * - onMutate: la tarjeta cambia de columna al instante (`applyMove`, la misma
 *   lógica que usa el servidor) y queda marcada como pendiente;
 * - onError: se restaura el tablero anterior y se avisa con un toast;
 * - onSuccess: toast de confirmación;
 * - onSettled: se refrescan el tablero, el dashboard y las tablas.
 */
export function useMoveOrder() {
  const queryClient = useQueryClient();
  const [pendingIds, setPendingIds] = useState<ReadonlySet<string>>(new Set());

  const setPending = (id: string, pending: boolean) =>
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(id);
      else next.delete(id);
      return next;
    });

  const mutation = useMutation<MoveResultDto, unknown, MoveVariables, { previous?: BoardDto }>({
    mutationFn: ({ id, toStatus, toIndex }) =>
      apiFetch<MoveResultDto>(`/api/orders/${id}/move`, {
        method: "PATCH",
        json: { toStatus, toIndex },
      }),
    onMutate: async ({ id, toStatus, toIndex }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.board() });
      const previous = queryClient.getQueryData<BoardDto>(queryKeys.board());
      if (previous) {
        queryClient.setQueryData<BoardDto>(queryKeys.board(), {
          ...previous,
          columns: applyMove(previous.columns, id, toStatus, toIndex),
        });
      }
      setPending(id, true);
      return { previous };
    },
    onError: (error, { code }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.board(), context.previous);
      const reason = error instanceof ApiError && error.status !== 0 ? ` (${error.message})` : "";
      toast.error(`No se pudo mover ${code}. Se restauró su posición${reason}.`);
    },
    onSuccess: (result, { code }) => {
      toast.success(`${code} movido a "${statusLabel(result.status)}"`);
    },
    onSettled: async (_data, _error, { id }) => {
      setPending(id, false);
      for (const queryKey of ORDER_DEPENDENT_KEYS) {
        await queryClient.invalidateQueries({ queryKey: [...queryKey] });
      }
    },
  });

  return { move: mutation.mutate, pendingIds };
}
