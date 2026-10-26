import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { latestIdentityProvider, LOGIN_PATH, PROVIDER_COOKIE, sanitizeNextPath } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Duración de la etiqueta de proveedor; al caducar se muestra el original de la cuenta. */
const PROVIDER_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Vuelta del flujo OAuth (Requisitos 2.5 y 2.6). Supabase redirige aquí con
 * `?code=…` tras el consentimiento en Google o GitHub. Se canjea el código por
 * una sesión (PKCE: el code_verifier está en una cookie) y se redirige a `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = sanitizeNextPath(searchParams.get("next"));

  const failTo = (code: "oauth" | "callback") => {
    const url = new URL(LOGIN_PATH, origin);
    url.searchParams.set("error", code);
    if (next !== "/dashboard") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  };

  // El proveedor devolvió un error (p. ej. el usuario canceló el consentimiento).
  if (searchParams.has("error")) return failTo("oauth");

  const code = searchParams.get("code");
  if (!code) return failTo("callback");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchangeCodeForSession:", error.message);
    return failTo("callback");
  }

  // Si el usuario tiene Google y GitHub vinculados (mismo email), la identidad
  // con el login más reciente es la que se acaba de usar.
  const provider = latestIdentityProvider(data.user?.identities);
  const cookieStore = await cookies();
  if (provider) {
    cookieStore.set(PROVIDER_COOKIE, provider, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: PROVIDER_COOKIE_MAX_AGE,
    });
  } else {
    cookieStore.delete(PROVIDER_COOKIE);
  }

  // Las cookies de sesión las escribe el cliente de Supabase vía cookies().
  return NextResponse.redirect(new URL(next, origin));
}
