import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PROVIDER_COOKIE, sessionUserFromClaims, type SessionUser } from "../auth";
import { getSupabasePublicEnv } from "../config";

export type SessionUpdate = {
  /** Respuesta que lleva las cookies de sesión refrescadas. Hay que devolverla (o copiarla). */
  response: NextResponse;
  user: SessionUser | null;
};

/**
 * Refresca la sesión de Supabase en el proxy y verifica el JWT con getClaims()
 * (verificación local con las claves públicas del proyecto).
 *
 * Las cookies nuevas se escriben en la petición (para los Server Components de
 * esta misma petición) y en la respuesta (para el navegador).
 */
export async function updateSession(request: NextRequest): Promise<SessionUpdate> {
  const env = getSupabasePublicEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  // No debe haber código entre la creación del cliente y getClaims(): es la
  // llamada que refresca el token si está a punto de caducar.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  return {
    response,
    user: claims?.sub
      ? sessionUserFromClaims(claims, request.cookies.get(PROVIDER_COOKIE)?.value)
      : null,
  };
}

/**
 * Redirección que conserva las cookies y cabeceras de la sesión refrescada. Sin
 * esto, una redirección justo después de refrescar el token cerraría la sesión.
 */
export function redirectPreservingSession(source: NextResponse, url: URL): NextResponse {
  const redirect = NextResponse.redirect(url);
  for (const cookie of source.cookies.getAll()) redirect.cookies.set(cookie);
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = source.headers.get(key);
    if (value) redirect.headers.set(key, value);
  }
  return redirect;
}
