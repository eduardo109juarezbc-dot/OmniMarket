import type { PageMeta } from "@/lib/filters";
import { Button } from "./button";

/** Paginación anterior/siguiente con el rango visible ("21–40 de 300"). */
export function Pagination({
  meta,
  onPageChange,
  pending = false,
  label = "registros",
}: {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  pending?: boolean;
  label?: string;
}) {
  const totalPages = Math.max(1, meta.totalPages);
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = Math.min(meta.total, meta.page * meta.limit);

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 text-sm"
    >
      <p className="text-muted" aria-live="polite">
        {from}–{to} de {meta.total} {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={meta.page <= 1 || pending}
          onClick={() => onPageChange(meta.page - 1)}
        >
          Anterior
        </Button>
        <span className="text-muted tabular-nums">
          Página {meta.page} de {totalPages}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={meta.page >= totalPages || pending}
          onClick={() => onPageChange(meta.page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
