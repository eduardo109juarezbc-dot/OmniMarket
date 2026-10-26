"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import { pollingInterval, useRealtimeOrders } from "@/hooks/use-realtime-orders";
import { useMoveOrder } from "@/hooks/use-move-order";
import { apiFetch } from "@/lib/api-client";
import type { BoardCardDto, BoardDto } from "@/lib/api-types";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/domain";
import { STATUS_COLUMNS, statusLabel } from "@/lib/kanban";
import { queryKeys } from "@/lib/query-keys";
import { KanbanCardContent } from "./kanban-card";
import { columnDropId, KanbanColumn } from "./kanban-column";

function findCard(board: BoardDto, id: string | number): BoardCardDto | undefined {
  for (const status of ORDER_STATUSES) {
    const card = board.columns[status].find((candidate) => candidate.id === id);
    if (card) return card;
  }
  return undefined;
}

/**
 * Destino de un soltado: columna e índice contado sin la tarjeta arrastrada
 * (la semántica de `applyMove` y de PATCH /move).
 * - sobre una columna: al final;
 * - sobre una tarjeta de otra columna: antes de ella, o después si se suelta
 *   por debajo de su mitad;
 * - sobre una tarjeta de la misma columna: su índice (como arrayMove).
 */
function dropTarget(
  board: BoardDto,
  event: DragEndEvent,
): { toStatus: OrderStatus; toIndex: number } | null {
  const { active, over } = event;
  if (!over) return null;
  const card = findCard(board, active.id);
  if (!card) return null;

  const overStatus = over.data.current?.status as OrderStatus | undefined;
  if (!overStatus) return null;

  if (String(over.id) === columnDropId(overStatus)) {
    const rest = board.columns[overStatus].filter((candidate) => candidate.id !== card.id);
    return { toStatus: overStatus, toIndex: rest.length };
  }

  const column = board.columns[overStatus];
  const overIndex = column.findIndex((candidate) => candidate.id === over.id);
  if (overIndex === -1) return null;
  if (overStatus === card.status) return { toStatus: overStatus, toIndex: overIndex };

  const translated = active.rect.current.translated;
  const below = translated
    ? translated.top + translated.height / 2 > over.rect.top + over.rect.height / 2
    : false;
  return { toStatus: overStatus, toIndex: overIndex + (below ? 1 : 0) };
}

/**
 * Teclado (Requisito 11.3): ← y → saltan a la columna contigua (al inicio de
 * su lista); ↑ y ↓ reordenan dentro de la columna con la lógica de dnd-kit.
 * Elegir la columna por estado, y no por geometría, evita que tarjetas de la
 * misma columna cuenten como "a la derecha" por diferencias de píxeles.
 */
const kanbanKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") {
    return sortableKeyboardCoordinates(event, args);
  }
  const { active, over, droppableRects } = args.context;
  const current = (over?.data.current?.status ?? active?.data.current?.status) as
    OrderStatus | undefined;
  if (!current) return undefined;
  event.preventDefault();
  const next =
    ORDER_STATUSES[ORDER_STATUSES.indexOf(current) + (event.code === "ArrowRight" ? 1 : -1)];
  const rect = next ? droppableRects.get(columnDropId(next)) : undefined;
  return rect ? { x: rect.left + 12, y: rect.top + 8 } : undefined;
};

/** Tablero Kanban con drag and drop y mutación optimista (Requisito 11). */
export function KanbanBoard({ initialData }: { initialData: BoardDto }) {
  const live = useRealtimeOrders();
  const board = useQuery({
    queryKey: queryKeys.board(),
    queryFn: () => apiFetch<BoardDto>("/api/orders/board"),
    initialData,
    refetchInterval: pollingInterval(live),
  });
  const { move, pendingIds } = useMoveOrder();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // 5 px de margen: un clic no inicia un arrastre.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: kanbanKeyboardCoordinates }),
  );

  const data = board.data;
  const now = useMemo(() => new Date(data.generatedAt), [data.generatedAt]);
  const activeCard = activeId ? findCard(data, activeId) : undefined;

  const describe = (id: string | number) => findCard(data, id)?.code ?? "El pedido";
  const columnOf = (overId: string | number | undefined, overStatus: unknown) =>
    overStatus ? statusLabel(overStatus as OrderStatus) : overId ? String(overId) : "";

  // Anuncios en español para lectores de pantalla (Requisito 11.9).
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Has tomado ${describe(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${describe(active.id)} está sobre la columna ${columnOf(over.id, over.data.current?.status)}.`
        : `${describe(active.id)} no está sobre ninguna columna.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${describe(active.id)} soltado en ${columnOf(over.id, over.data.current?.status)}.`
        : `${describe(active.id)} soltado fuera del tablero; no se movió.`,
    onDragCancel: ({ active }) => `Movimiento cancelado. ${describe(active.id)} vuelve a su sitio.`,
  };

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const card = findCard(data, event.active.id);
    const target = dropTarget(data, event);
    if (!card || !target) return;

    const currentIndex = data.columns[card.status].findIndex(
      (candidate) => candidate.id === card.id,
    );
    if (target.toStatus === card.status && target.toIndex === currentIndex) return;

    move({ id: card.id, code: card.code, ...target });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Arrastra con el ratón o el dedo. Con teclado: Tab hasta la tarjeta, Espacio para tomarla,
          flechas para moverla y Espacio para soltarla.
        </p>
        <LiveIndicator status={live} />
      </div>
      <DndContext
        id="kanban-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Para mover un pedido, pulsa Espacio o Intro. Usa las flechas para cambiarlo de posición o de columna y vuelve a pulsar Espacio o Intro para soltarlo. Escape cancela.",
          },
        }}
      >
        <div className="flex gap-3 overflow-x-auto pb-2" data-testid="kanban-board">
          {STATUS_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              label={column.label}
              cards={data.columns[column.status]}
              now={now}
              pendingIds={pendingIds}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <KanbanCardContent card={activeCard} now={now} overlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
