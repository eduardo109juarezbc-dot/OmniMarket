"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Selección de filas para la edición en lote (Requisito 12.1). Se vacía al
 * cambiar `scopeKey` (página o filtros), porque la selección es por página.
 */
export function useRowSelection(visibleIds: readonly string[], scopeKey: string) {
  const [state, setState] = useState<{ scope: string; ids: ReadonlySet<string> }>({
    scope: scopeKey,
    ids: new Set(),
  });
  // Derivado durante el render (sin efecto): otro ámbito equivale a selección vacía.
  const selected = useMemo(
    () => (state.scope === scopeKey ? state.ids : new Set<string>()),
    [state, scopeKey],
  );

  const update = useCallback(
    (fn: (current: Set<string>) => void) =>
      setState((current) => {
        const next = new Set(current.scope === scopeKey ? current.ids : []);
        fn(next);
        return { scope: scopeKey, ids: next };
      }),
    [scopeKey],
  );

  const visibleSelected = useMemo(
    () => visibleIds.filter((id) => selected.has(id)),
    [visibleIds, selected],
  );
  const allSelected = visibleIds.length > 0 && visibleSelected.length === visibleIds.length;

  return {
    selected,
    count: selected.size,
    isSelected: (id: string) => selected.has(id),
    allSelected,
    someSelected: visibleSelected.length > 0 && !allSelected,
    toggle: (id: string) => update((next) => (next.has(id) ? next.delete(id) : next.add(id))),
    toggleAll: () =>
      update((next) => {
        if (allSelected) visibleIds.forEach((id) => next.delete(id));
        else visibleIds.forEach((id) => next.add(id));
      }),
    clear: () => update((next) => next.clear()),
  };
}
