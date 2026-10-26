"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Skeleton } from "@/components/ui/skeleton";
import type { BoardCardDto } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import { formatMoney, formatRelativeDate } from "@/lib/format";

type CardProps = {
  card: BoardCardDto;
  /** Referencia de "ahora" que llega del servidor (hidratación estable). */
  now: Date;
  pending?: boolean;
};

/** Contenido de la tarjeta: código, cliente, total y antigüedad (Requisito 11.2). */
export function KanbanCardContent({
  card,
  now,
  pending,
  overlay,
}: CardProps & { overlay?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-md border border-line bg-surface p-3 text-sm shadow-sm",
        // Sin rotate/scale: deformarían la caja medida del overlay y alterarían
        // la detección de colisiones de dnd-kit.
        overlay && "border-brand shadow-lg ring-2 ring-brand/30",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <span className="font-semibold">{card.code}</span>
        <span className="tabular-nums">{formatMoney(card.total)}</span>
      </div>
      <span className="truncate text-muted">{card.customerName}</span>
      <span className="text-xs text-muted">{formatRelativeDate(card.createdAt, now)}</span>
      {pending && (
        <div className="mt-1 flex items-center gap-2" role="status">
          <Skeleton className="h-1.5 flex-1" />
          <span className="sr-only">Guardando movimiento…</span>
        </div>
      )}
    </div>
  );
}

/** Tarjeta arrastrable (ratón, táctil y teclado; Requisito 11.3). */
export function SortableKanbanCard({ card, now, pending }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { status: card.status },
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "touch-manipulation rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand",
        isDragging && "opacity-40",
        pending && "opacity-80",
      )}
      data-testid={`kanban-card-${card.code}`}
      data-status={card.status}
      aria-busy={pending || undefined}
      {...attributes}
      aria-roledescription="pedido arrastrable"
      aria-label={`${card.code}, ${card.customerName}, ${formatMoney(card.total)}`}
      {...listeners}
    >
      <KanbanCardContent card={card} now={now} pending={pending} />
    </li>
  );
}
