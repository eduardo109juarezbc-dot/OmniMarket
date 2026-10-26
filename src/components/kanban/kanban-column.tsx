"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { STATUS_STYLE } from "@/components/orders/status-style";
import type { BoardCardDto } from "@/lib/api-types";
import { cn } from "@/lib/cn";
import type { OrderStatus } from "@/lib/domain";
import { SortableKanbanCard } from "./kanban-card";

export const columnDropId = (status: OrderStatus) => `column-${status}`;

/** Columna del tablero: zona de soltado (también vacía) con sus tarjetas ordenadas. */
export function KanbanColumn({
  status,
  label,
  cards,
  now,
  pendingIds,
}: {
  status: OrderStatus;
  label: string;
  cards: BoardCardDto[];
  now: Date;
  pendingIds: ReadonlySet<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(status), data: { status } });
  const headingId = `kanban-heading-${status}`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        // Columnas flexibles: en escritorio caben las 6 sin scroll horizontal. Con
        // scroll, el KeyboardSensor de dnd-kit desplaza el tablero en lugar de
        // mover la tarjeta al pulsar ← / →.
        "flex min-w-40 flex-1 basis-0 flex-col rounded-lg bg-subtle transition-colors",
        isOver && "bg-brand-soft ring-2 ring-brand",
      )}
      data-testid={`kanban-column-${status}`}
    >
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-full"
            style={{ background: STATUS_STYLE[status].color }}
          />
          {label}
        </h2>
        <span
          className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted tabular-nums"
          data-testid={`kanban-count-${status}`}
        >
          {cards.length}
        </span>
      </header>
      <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className="flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3"
          aria-label={`Pedidos en ${label}`}
        >
          {cards.map((card) => (
            <SortableKanbanCard
              key={card.id}
              card={card}
              now={now}
              pending={pendingIds.has(card.id)}
            />
          ))}
          {cards.length === 0 && (
            <li className="rounded-md border border-dashed border-line p-4 text-center text-xs text-muted">
              Suelta aquí un pedido
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}
