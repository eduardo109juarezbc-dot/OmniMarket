import "server-only";
import type { NextRequest } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { idSchema } from "@/lib/schemas";
import { requireUser } from "./auth";
import { getDb, type Db } from "./db/client";
import { toErrorResponse } from "./errors";

type HandlerArgs<P> = { request: NextRequest; params: P; user: SessionUser; db: Db };

/**
 * Envuelve un Route Handler de la API privada:
 * 1. exige sesión válida (401 si no, Requisitos 3.3 y 3.4);
 * 2. resuelve los `params` (asíncronos en Next.js 16);
 * 3. traduce DomainError y ZodError a 4xx, y cualquier otro error a 500 sin detalles.
 */
export function privateRoute<P = Record<string, never>>(
  context: string,
  handler: (args: HandlerArgs<P>) => Promise<Response>,
) {
  return async (request: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    try {
      const params = ((await ctx?.params) ?? {}) as P;
      return await handler({ request, params, user: auth.user, db: getDb() });
    } catch (error) {
      return toErrorResponse(error, context);
    }
  };
}

/** Valida el segmento [id] de la ruta (UUID). Un id mal formado responde 400. */
export function parseId(value: string): string {
  return idSchema.parse(value);
}
