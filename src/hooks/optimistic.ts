"use client";

import type { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Utilidades de mutación optimista (Requisitos 11 y 12, PDF §4): se guarda una
 * foto de todas las queries afectadas, se aplica el cambio al instante y, si
 * el servidor falla, se restaura la foto completa.
 */
export type Snapshot = [QueryKey, unknown][];

export async function snapshotQueries(
  queryClient: QueryClient,
  queryKey: QueryKey,
): Promise<Snapshot> {
  // Cancela refetches en curso para que no pisen el estado optimista.
  await queryClient.cancelQueries({ queryKey });
  return queryClient.getQueriesData({ queryKey });
}

export function restoreSnapshot(queryClient: QueryClient, snapshot: Snapshot | undefined): void {
  for (const [key, data] of snapshot ?? []) queryClient.setQueryData(key, data);
}

/** Id temporal para filas creadas de forma optimista (se sustituye al refrescar). */
export function tempId(): string {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

export const isTempId = (id: string) => id.startsWith("temp-");
