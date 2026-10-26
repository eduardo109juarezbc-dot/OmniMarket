/**
 * npx tsx scripts/check-env.ts — valida .env.local sin mostrar valores y prueba
 * las dos conexiones a la base de datos.
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: [".env.local", ".env"], quiet: true });

const env = process.env;
const placeholder = /TU_PASSWORD|\[YOUR-PASSWORD\]/;

const checks: Record<string, (value: string | undefined) => boolean> = {
  NEXT_PUBLIC_SUPABASE_URL: (v) => !!v && /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(v),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: (v) => /^sb_publishable_/.test(v ?? ""),
  DATABASE_URL: (v) => !!v && !placeholder.test(v) && v.includes(":6543/"),
  DATABASE_URL_DIRECT: (v) => !!v && !placeholder.test(v) && v.includes(":5432/"),
  TEST_API_TOKEN: (v) => (v ?? "").length >= 16,
};

let allOk = true;
for (const [key, ok] of Object.entries(checks)) {
  const passed = ok(env[key]);
  allOk &&= passed;
  console.log(`${passed ? "OK   " : "FALLA"} ${key}`);
}

async function probe(key: "DATABASE_URL" | "DATABASE_URL_DIRECT") {
  const url = env[key];
  if (!url) return;
  try {
    new URL(url);
  } catch {
    console.log(`FALLA ${key}: URL mal formada (¿caracteres especiales sin codificar?)`);
    allOk = false;
    return;
  }
  const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15, onnotice: () => {} });
  try {
    const started = performance.now();
    const [row] =
      await sql`select current_user as "user", current_setting('server_version') as version`;
    const firstMs = Math.round(performance.now() - started);
    const again = performance.now();
    await sql`select 1`;
    const nextMs = Math.round(performance.now() - again);
    console.log(
      `CONECTA ${key}: rol ${row?.user}, Postgres ${row?.version}, primera ${firstMs} ms, siguiente ${nextMs} ms`,
    );
  } catch (error) {
    allOk = false;
    console.log(`ERROR ${key}: ${(error as Error).message}`);
  } finally {
    await sql.end();
  }
}

async function main() {
  await probe("DATABASE_URL");
  await probe("DATABASE_URL_DIRECT");
  process.exit(allOk ? 0 : 1);
}

void main();
