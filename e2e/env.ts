/**
 * Entorno de los E2E: siempre el Supabase LOCAL (`npx supabase start`), nunca
 * el proyecto real. Los valores se leen de `supabase status` (o de variables
 * E2E_* si ya vienen definidas, p. ej. en CI).
 */
import { execSync } from "node:child_process";

type LocalSupabase = {
  apiUrl: string;
  publishableKey: string;
  secretKey: string;
  dbUrl: string;
};

let cached: LocalSupabase | undefined;

export function localSupabase(): LocalSupabase {
  if (cached) return cached;
  const fromEnv = {
    apiUrl: process.env.E2E_SUPABASE_URL,
    publishableKey: process.env.E2E_SUPABASE_PUBLISHABLE_KEY,
    secretKey: process.env.E2E_SUPABASE_SECRET_KEY,
    dbUrl: process.env.E2E_DATABASE_URL,
  };
  if (Object.values(fromEnv).every(Boolean)) {
    cached = fromEnv as LocalSupabase;
    return cached;
  }

  let status: Record<string, string>;
  try {
    status = JSON.parse(
      execSync("npx supabase status -o json", { stdio: ["ignore", "pipe", "ignore"] }).toString(),
    );
  } catch {
    throw new Error(
      "No se encontró el Supabase local. Arráncalo con `npx supabase start` (requiere Docker).",
    );
  }
  const apiUrl = status.API_URL ?? "";
  // Salvaguarda: los E2E crean usuarios con contraseña y restablecen datos.
  if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(apiUrl)) {
    throw new Error(`Los E2E solo se ejecutan contra un Supabase local (recibido ${apiUrl}).`);
  }
  cached = {
    apiUrl,
    publishableKey: status.PUBLISHABLE_KEY ?? status.ANON_KEY ?? "",
    secretKey: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY ?? "",
    dbUrl: status.DB_URL ?? "",
  };
  return cached;
}

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100);
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_TEST_API_TOKEN = process.env.E2E_TEST_API_TOKEN ?? "e2e-test-token-0123456789";
export const E2E_USER = {
  email: "e2e@omnimarket.test",
  password: "e2e-password-0123456789",
  name: "Operador E2E",
};
export const STORAGE_STATE = "e2e/.auth/operator.json";
