import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Bloque de carga con la forma del contenido final (PDF §4: skeletons en lugar
 * de spinners). Es decorativo: el anuncio para lectores de pantalla lo hace
 * `LoadingRegion`.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-skeleton", className)}
      {...props}
    />
  );
}

/**
 * Envuelve un conjunto de skeletons: marca la región como ocupada y anuncia
 * la carga a los lectores de pantalla.
 */
export function LoadingRegion({
  label = "Cargando…",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
