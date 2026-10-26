"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ORDER_DEPENDENT_KEYS } from "@/lib/query-keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type LiveStatus = "connecting" | "live" | "polling";

/** Intervalo de respaldo cuando Realtime no está disponible (Requisito 9.5). */
export const POLLING_INTERVAL_MS = 15_000;

const SUBSCRIBE_TIMEOUT_MS = 10_000;
const DEBOUNCE_MS = 500;

/**
 * Suscripción a los cambios de `orders` con Supabase Realtime (Requisito 9.4).
 * Cada cambio invalida (con debounce) el dashboard, las ventas, los pedidos y
 * el tablero. Mientras hay una mutación propia en curso se pospone, para no
 * pisar el estado optimista. Si el canal falla, se pasa a polling cada 15 s.
 */
export function useRealtimeOrders(): LiveStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("connecting");

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let debounce: ReturnType<typeof setTimeout> | undefined;

    const invalidate = () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (queryClient.isMutating() > 0) return invalidate();
        for (const queryKey of ORDER_DEPENDENT_KEYS) {
          void queryClient.invalidateQueries({ queryKey: [...queryKey] });
        }
      }, DEBOUNCE_MS);
    };

    const fallback = setTimeout(() => {
      setStatus((current) => (current === "live" ? current : "polling"));
    }, SUBSCRIBE_TIMEOUT_MS);

    const channel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, invalidate)
      .subscribe((state) => {
        if (state === "SUBSCRIBED") {
          clearTimeout(fallback);
          setStatus("live");
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          setStatus("polling");
        }
      });

    return () => {
      clearTimeout(debounce);
      clearTimeout(fallback);
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return status;
}

/** `refetchInterval` para las queries según el estado del canal. */
export function pollingInterval(status: LiveStatus): number | false {
  return status === "live" ? false : POLLING_INTERVAL_MS;
}
