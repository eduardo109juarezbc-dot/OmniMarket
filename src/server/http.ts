import "server-only";
import type { z } from "zod";

/**
 * Utilidades HTTP de los Route Handlers. Formato de error uniforme:
 * { error: { code, message, details? } } (ver diseño, "Contratos de API").
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PRODUCT_IN_USE"
  | "SKU_TAKEN"
  | "TEST_API_DISABLED"
  | "INTERNAL_ERROR";

/** Las respuestas de la API nunca se cachean: dependen de la sesión o de datos vivos. */
const NO_STORE = { "Cache-Control": "no-store" } as const;

export function json<T>(data: T, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(NO_STORE)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return Response.json(data, { ...init, headers });
}

export function problem(
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
  init: ResponseInit = {},
): Response {
  return json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { ...init, status },
  );
}

/** 400 con los errores de Zod agrupados por campo. */
export function validationProblem(error: z.ZodError): Response {
  const issues = error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
  return problem(400, "VALIDATION_ERROR", "Los datos enviados no son válidos", issues);
}

/**
 * Mide la duración del handler y la expone en `Server-Timing` (Requisito 5.7).
 * `fn` recibe una función para leer los milisegundos transcurridos y poder
 * incluirlos también en el cuerpo (meta.durationMs).
 */
export async function withTiming(
  fn: (elapsedMs: () => number) => Promise<Response>,
  metric = "app",
): Promise<Response> {
  const started = performance.now();
  const elapsedMs = () => Math.round((performance.now() - started) * 10) / 10;
  const response = await fn(elapsedMs);
  response.headers.set("Server-Timing", `${metric};dur=${elapsedMs()}`);
  return response;
}

/** 500 sin detalles internos; el error completo queda en los logs del servidor. */
export function internalError(error: unknown, context: string): Response {
  console.error(`[${context}]`, error);
  return problem(500, "INTERNAL_ERROR", "Ha ocurrido un error inesperado");
}
