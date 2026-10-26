import { describe, expect, it } from "vitest";
import {
  applyMove,
  groupByStatus,
  needsRebalance,
  neighborsAt,
  positionBetween,
  STATUS_COLUMNS,
  type KanbanCard,
} from "@/lib/kanban";

describe("positionBetween", () => {
  it("calcula posiciones en columna vacía, al inicio, al final y en medio", () => {
    expect(positionBetween(null, null)).toBe(1000);
    expect(positionBetween(null, 1000)).toBe(0);
    expect(positionBetween(3000, null)).toBe(4000);
    expect(positionBetween(1000, 2000)).toBe(1500);
    expect(positionBetween(1000, 1001)).toBe(1000.5);
    expect(() => positionBetween(2000, 1000)).toThrow(RangeError);

    expect(needsRebalance(1000, 1000 + 1e-7)).toBe(true);
    expect(needsRebalance(1000, 1001)).toBe(false);
    expect(needsRebalance(null, 1000)).toBe(false);

    // Un índice mayor que la columna equivale a "al final".
    expect(neighborsAt([1000, 2000], 99)).toEqual({ prev: 2000, next: null, index: 2 });
    expect(neighborsAt([], 0)).toEqual({ prev: null, next: null, index: 0 });
  });
});

describe("applyMove", () => {
  const cards: KanbanCard[] = [
    { id: "A", status: "PENDING", position: 1000 },
    { id: "C", status: "PENDING", position: 3000 },
    { id: "B", status: "PENDING", position: 2000 },
    { id: "D", status: "PROCESSING", position: 1000 },
  ];

  const ids = (list: KanbanCard[]) => list.map((card) => card.id);

  it("mueve entre columnas y dentro de una columna sin mutar el tablero original", () => {
    const board = groupByStatus(cards);
    const snapshot = structuredClone(board);
    expect(ids(board.PENDING)).toEqual(["A", "B", "C"]);
    expect(STATUS_COLUMNS.map((column) => column.label)).toEqual([
      "Pendiente",
      "En proceso",
      "Empaquetado",
      "Enviado",
      "Entregado",
      "Cancelado",
    ]);

    // Entre columnas: A al principio de "En proceso".
    const crossed = applyMove(board, "A", "PROCESSING", 0);
    expect(ids(crossed.PENDING)).toEqual(["B", "C"]);
    expect(ids(crossed.PROCESSING)).toEqual(["A", "D"]);
    expect(crossed.PROCESSING[0]).toEqual({ id: "A", status: "PROCESSING", position: 0 });

    // Misma columna: C entre A y B (índice contado sin C).
    const reordered = applyMove(board, "C", "PENDING", 1);
    expect(ids(reordered.PENDING)).toEqual(["A", "C", "B"]);
    expect(reordered.PENDING[1]?.position).toBe(1500);

    // Índice fuera de rango: al final de la columna destino.
    const toEnd = applyMove(board, "D", "PENDING", 99);
    expect(ids(toEnd.PENDING)).toEqual(["A", "B", "C", "D"]);
    expect(toEnd.PENDING[3]?.position).toBe(4000);
    expect(toEnd.PROCESSING).toEqual([]);

    // Tarjeta inexistente: mismo tablero.
    expect(applyMove(board, "Z", "SHIPPED", 0)).toBe(board);

    // La entrada no se modifica (requisito de la actualización optimista).
    expect(board).toEqual(snapshot);
  });

  it("renumera la columna destino cuando los vecinos están demasiado juntos", () => {
    const board = groupByStatus<KanbanCard>([
      { id: "X", status: "PACKED", position: 1000 },
      { id: "Y", status: "PACKED", position: 1000 + 1e-7 },
      { id: "M", status: "SHIPPED", position: 1000 },
    ]);
    const moved = applyMove(board, "M", "PACKED", 1);
    expect(moved.PACKED.map((card) => [card.id, card.position])).toEqual([
      ["X", 1000],
      ["M", 2000],
      ["Y", 3000],
    ]);
    expect(moved.SHIPPED).toEqual([]);
  });
});
