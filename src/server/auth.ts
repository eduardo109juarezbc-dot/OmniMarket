import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { PROVIDER_COOKIE, sessionUserFromClaims, type SessionUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { problem } from "./http";

/**
 * Operador de la petición actual, verificado con getClaims() (firma del JWT).
 * `cache` lo deduplica dentro de una misma petición (cabecera + página).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Con Partial Prefetching, Next.js prerenderiza el App Shell con las cookies
  // disponibles, así que cookies() no detiene el prerender. getClaims() compara
  // Date.now() con la caducidad del token, y eso no puede ocurrir en el shell.
  // connection() fuerza a verificar la sesión en cada petición real (nunca se
  // cachea una decisión de autenticación). El bloque va siempre en <Suspense>.
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const providerCookie = (await cookies()).get(PROVIDER_COOKIE)?.value;
  return sessionUserFromClaims(data.claims, providerCookie);
});

export type RequireUserResult =
  { user: SessionUser; response?: never } | { user?: never; response: Response };

/**
 * Guardia de la API privada (Requisitos 3.3 y 3.4). Uso en un Route Handler:
 *
 *   const auth = await requireUser();
 *   if (auth.response) return auth.response;
 *   // auth.user está verificado
 */
export async function requireUser(): Promise<RequireUserResult> {
  const user = await getSessionUser();
  if (!user) return { response: problem(401, "UNAUTHORIZED", "Sesión requerida") };
  return { user };
}
