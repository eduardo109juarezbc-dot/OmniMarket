import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicEnv } from "../config";

/**
 * Cliente de Supabase para Server Components, Route Handlers y Server Actions.
 * Se crea uno por petición (no se reutiliza): así cada respuesta recibe sus
 * propias cookies y cabeceras de no-caché.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const env = getSupabasePublicEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Los Server Components no pueden escribir cookies. No es un problema:
            // el proxy ya refrescó la sesión antes de renderizar.
          }
        },
      },
    },
  );
}
