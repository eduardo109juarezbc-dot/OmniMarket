"use client";

import { useEffect, useState } from "react";

/** Devuelve `value` tras `delayMs` sin cambios (búsquedas mientras se escribe). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Refleja los filtros en la URL sin recargar ni añadir entradas al historial.
 * Next.js integra window.history.replaceState con su router.
 */
export function useSyncUrlQuery(query: Record<string, string | number | boolean | undefined>) {
  const serialized = JSON.stringify(query);
  useEffect(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(JSON.parse(serialized) as Record<string, unknown>)) {
      if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    }
    const search = params.toString();
    const url = `${window.location.pathname}${search ? `?${search}` : ""}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, "", url);
    }
  }, [serialized]);
}
