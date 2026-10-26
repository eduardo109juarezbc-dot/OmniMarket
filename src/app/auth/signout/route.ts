import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, PROVIDER_COOKIE } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Cierre de sesión (Requisito 2.7). Solo POST, desde el formulario de la
 * cabecera. Se comprueba el origen para que otra web no pueda cerrar la sesión.
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse(null, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  // scope "local": cierra esta sesión; las de otros dispositivos siguen activas.
  await supabase.auth.signOut({ scope: "local" });
  (await cookies()).delete(PROVIDER_COOKIE);

  // 303: el navegador sigue la redirección con GET.
  return NextResponse.redirect(new URL(LOGIN_PATH, request.nextUrl.origin), { status: 303 });
}
