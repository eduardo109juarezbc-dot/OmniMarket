import "server-only";
import { z } from "zod";
import { internalError, problem, validationProblem, type ErrorCode } from "./http";

/**
 * Error de negocio con su respuesta HTTP. Los servicios lo lanzan y los
 * Route Handlers lo convierten con `toErrorResponse`.
 */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const notFound = (message = "Recurso no encontrado") =>
  new DomainError(404, "NOT_FOUND", message);

/** Código SQLSTATE de un error de Postgres (Drizzle lo envuelve en `cause`). */
export function pgErrorCode(error: unknown): string | undefined {
  const candidate = error as { code?: unknown; cause?: { code?: unknown } } | undefined;
  const code = candidate?.code ?? candidate?.cause?.code;
  return typeof code === "string" ? code : undefined;
}

export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";
export const PG_CHECK_VIOLATION = "23514";

export function toErrorResponse(error: unknown, context: string): Response {
  if (error instanceof DomainError) {
    return problem(error.status, error.code, error.message, error.details);
  }
  if (error instanceof z.ZodError) return validationProblem(error);
  return internalError(error, context);
}

/** Lee y valida un cuerpo JSON. Un JSON mal formado responde 400, no 500. */
export async function readJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new DomainError(400, "VALIDATION_ERROR", "El cuerpo de la petición no es JSON válido");
  }
  return schema.parse(body);
}

/** Valida query params (Object.fromEntries de searchParams). */
export function readQuery<T extends z.ZodType>(params: URLSearchParams, schema: T): z.infer<T> {
  return schema.parse(Object.fromEntries(params));
}
