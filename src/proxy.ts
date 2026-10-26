import type { NextRequest } from "next/server";
import { DEFAULT_AFTER_LOGIN, isPublicPath, LOGIN_PATH, loginPathFor } from "@/lib/auth";
import { redirectPreservingSession, updateSession } from "@/lib/supabase/proxy";

/**
 * Proxy (antes "middleware" en Next.js ≤ 15). Requisitos 3.1 y 3.2:
 * - refresca la sesión de Supabase en cada petición;
 * - sin sesión, las rutas privadas redirigen a /login?next=…;
 * - con sesión, /login redirige al dashboard.
 *
 * En /api/* solo refresca la sesión: el 401 lo devuelve cada handler con
 * requireUser(), que vuelve a validar el JWT (Requisito 3.4).
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) return response;

  if (!user && !isPublicPath(pathname)) {
    return redirectPreservingSession(
      response,
      new URL(loginPathFor(pathname, search), request.url),
    );
  }

  if (user && pathname === LOGIN_PATH) {
    return redirectPreservingSession(response, new URL(DEFAULT_AFTER_LOGIN, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Todo excepto:
     * - _next/static, _next/image y archivos estáticos (imágenes, iconos, robots…)
     * - /auth/* (callback y signout gestionan su propia sesión)
     * - /api/test/* (endpoints de auditoría: sin sesión y sin latencia extra)
     */
    "/((?!_next/static|_next/image|auth/|api/test/|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
