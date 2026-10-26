/**
 * Preparación de los E2E:
 * 1. aplica las migraciones al Supabase local;
 * 2. crea (o reutiliza) el operador de prueba con la API de administración;
 * 3. inicia sesión con contraseña y guarda las cookies de sesión (storageState).
 *
 * Es la "simulación de sesión" del PDF §5. El login con contraseña solo existe
 * en el Supabase local (supabase/config.toml); la app no tiene ningún formulario
 * de email: en producción el único acceso es OAuth (Requisitos 2.3 y 15.6).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { E2E_USER, localSupabase, STORAGE_STATE } from "./env";

export default async function globalSetup() {
  const supabase = localSupabase();

  const sql = postgres(supabase.dbUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), {
      migrationsFolder: "drizzle",
      migrationsSchema: "drizzle",
      migrationsTable: "__drizzle_migrations",
    });
  } finally {
    await sql.end();
  }

  const admin = createClient(supabase.apiUrl, supabase.secretKey, {
    auth: { persistSession: false },
  });
  const { error } = await admin.auth.admin.createUser({
    email: E2E_USER.email,
    password: E2E_USER.password,
    email_confirm: true,
    user_metadata: { full_name: E2E_USER.name },
  });
  if (error && !/already/i.test(error.message)) throw error;

  mkdirSync(dirname(STORAGE_STATE), { recursive: true });
  writeFileSync(
    STORAGE_STATE,
    JSON.stringify({ cookies: await sessionCookies(), origins: [] }, null, 2),
  );
}

/**
 * Inicia una sesión nueva del operador de prueba y devuelve sus cookies en el
 * formato de Playwright. Los tests que cierran sesión usan una propia para no
 * revocar la compartida (storageState).
 */
export async function sessionCookies() {
  const supabase = localSupabase();
  const jar = new Map<string, string>();
  const client = createServerClient(supabase.apiUrl, supabase.publishableKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({
    email: E2E_USER.email,
    password: E2E_USER.password,
  });
  if (error) throw new Error(`No se pudo iniciar la sesión de prueba: ${error.message}`);

  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  return [...jar].map(([name, value]) => ({
    name,
    value,
    domain: "localhost",
    path: "/",
    expires,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }));
}
