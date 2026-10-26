"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Los datos iniciales llegan del servidor; evita refetch inmediato al hidratar.
        staleTime: 10_000,
        refetchOnWindowFocus: true,
        retry: 1,
      },
      mutations: {
        // Las mutaciones optimistas gestionan su propio rollback; no se reintentan.
        retry: 0,
      },
    },
  });
}

/** Proveedores de cliente: caché de TanStack Query y región de toasts. */
export function Providers({ children }: { children: ReactNode }) {
  // Una instancia por pestaña; useState evita recrearla en cada render.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        theme="light"
        richColors
        closeButton
        duration={4000}
        containerAriaLabel="Notificaciones"
        toastOptions={{ closeButtonAriaLabel: "Cerrar notificación" }}
      />
    </QueryClientProvider>
  );
}
