import type { ReactNode } from "react";
import { Button } from "./button";

/**
 * Barra de acciones en lote. Aparece fija abajo cuando hay filas seleccionadas;
 * es una región etiquetada y anuncia el número de seleccionados.
 */
export function BulkActionBar({
  count,
  noun,
  onClear,
  children,
}: {
  count: number;
  /** Sustantivo en plural: "pedidos", "productos". */
  noun: string;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Acciones en lote"
      className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 shadow-lg"
      data-testid="bulk-bar"
    >
      <p className="text-sm font-medium" aria-live="polite">
        {count} {noun} seleccionados
      </p>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      <Button variant="ghost" size="sm" onClick={onClear}>
        Quitar selección
      </Button>
    </div>
  );
}
