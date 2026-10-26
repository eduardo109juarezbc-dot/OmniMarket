"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "../config";

let browserClient: SupabaseClient | undefined;

/**
 * Cliente de Supabase para el navegador (login OAuth y Realtime).
 * Usa el flujo PKCE por defecto: el `code_verifier` se guarda en una cookie que
 * después lee /auth/callback en el servidor.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const env = getSupabasePublicEnv();
    browserClient = createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  }
  return browserClient;
}
