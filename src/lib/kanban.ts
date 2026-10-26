import { ORDER_STATUSES, ORDER_STATUS_LABELS, type OrderStatus } from "./domain";

/**
 * Lógica pura del tablero Kanban. La comparten el cliente (actualización
 * optimista) y el servidor (cálculo de la posición persistida), para que
 * ambos coloquen la tarjeta en el mismo sitio.
 */

export type KanbanColumn = { status: OrderStatus; label: string };

/** Columnas en orden de izquierda a derecha. */
export const STATUS_COLUMNS: readonly KanbanColumn[] = ORDER_STATUSES.map((status) => ({
  status,
  label: ORDER_STATUS_LABELS[status],
}));

export function statusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

/** Separación entre posiciones al añadir al principio o al final de una columna. */
export const POSITION_STEP = 1000;

/** Por debajo de esta separación entre vecinos hay que renumerar la columna. */
export const MIN_POSITION_GAP = 1e-6;

/**
 * Posición fraccional entre dos vecinos (indexación fraccional):
 * - columna vacía → POSITION_STEP
 * - al principio → next − POSITION_STEP
 * - al final → prev + POSITION_STEP
 * - en medio → punto medio
 */
export function positionBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return POSITION_STEP;
  if (prev === null) return (next as number) - POSITION_STEP;
  if (next === null) return prev + POSITION_STEP;
  if (next <= prev) {
    throw new RangeError(`Vecinos desordenados: prev=${prev}, next=${next}`);
  }
  return prev + (next - prev) / 2;
}

/** true si los vecinos están tan juntos que el punto medio pierde precisión. */
export function needsRebalance(prev: number | null, next: number | null): boolean {
  return prev !== null && next !== null && next - prev < MIN_POSITION_GAP;
}

/** Posiciones renumeradas (1000, 2000, …) para una columna, en su orden actual. */
export function rebalancedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) * POSITION_STEP);
}

export type KanbanCard = { id: string; status: OrderStatus; position: number };

export type Board<T extends KanbanCard> = Record<OrderStatus, T[]>;

export function emptyBoard<T extends KanbanCard>(): Board<T> {
  return Object.fromEntries(ORDER_STATUSES.map((status) => [status, [] as T[]])) as Board<T>;
}

/** Agrupa tarjetas por columna y las ordena por posición. */
export function groupByStatus<T extends KanbanCard>(cards: readonly T[]): Board<T> {
  const board = emptyBoard<T>();
  for (const card of cards) board[card.status].push(card);
  for (const status of ORDER_STATUSES) board[status].sort((a, b) => a.position - b.position);
  return board;
}

/**
 * Vecinos de un hueco en una columna ordenada. `toIndex` mayor que la longitud
 * se interpreta como "al final" (Requisito 7 y diseño del movimiento).
 */
export function neighborsAt(
  positions: readonly number[],
  toIndex: number,
): { prev: number | null; next: number | null; index: number } {
  const index = Math.max(0, Math.min(toIndex, positions.length));
  return {
    prev: index > 0 ? (positions[index - 1] ?? null) : null,
    next: index < positions.length ? (positions[index] ?? null) : null,
    index,
  };
}

/**
 * Mueve una tarjeta a `toStatus` en el índice `toIndex`, contado sobre la
 * columna destino sin la tarjeta (igual que arrayMove de dnd-kit dentro de una
 * misma columna). Devuelve un tablero nuevo; la entrada no se modifica.
 * Si la tarjeta no existe, devuelve el mismo tablero.
 */
export function applyMove<T extends KanbanCard>(
  board: Board<T>,
  cardId: string,
  toStatus: OrderStatus,
  toIndex: number,
): Board<T> {
  let card: T | undefined;
  for (const status of ORDER_STATUSES) {
    card = board[status].find((candidate) => candidate.id === cardId);
    if (card) break;
  }
  if (!card) return board;

  const fromStatus = card.status;
  const target = board[toStatus].filter((candidate) => candidate.id !== cardId);
  const { prev, next, index } = neighborsAt(
    target.map((candidate) => candidate.position),
    toIndex,
  );

  let targetColumn: T[];
  if (needsRebalance(prev, next)) {
    // Renumera la columna destino para mantener posiciones bien separadas.
    const ordered = [...target];
    ordered.splice(index, 0, card);
    const positions = rebalancedPositions(ordered.length);
    targetColumn = ordered.map((item, i) => ({
      ...item,
      status: toStatus,
      position: positions[i] as number,
    }));
  } else {
    targetColumn = [...target];
    targetColumn.splice(index, 0, {
      ...card,
      status: toStatus,
      position: positionBetween(prev, next),
    });
  }

  const result: Board<T> = { ...board, [toStatus]: targetColumn };
  if (fromStatus !== toStatus) {
    result[fromStatus] = board[fromStatus].filter((candidate) => candidate.id !== cardId);
  }
  return result;
}
