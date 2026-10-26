/**
 * npm run db:seed — restablece la base al conjunto semilla.
 *
 * Usa DATABASE_URL_DIRECT (o DATABASE_URL) de .env.local. Es destructivo: en
 * una base que no sea local exige el flag --yes.
 */
import { config } from "dotenv";
import { createDb } from "../src/server/db/create";
import { resetDatabase } from "../src/server/services/reset";

config({ path: [".env.local", ".env"], quiet: true });

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  if (!url) {
    console.error("Falta DATABASE_URL_DIRECT (o DATABASE_URL) en .env.local.");
    process.exit(1);
  }

  const host = new URL(url).hostname;
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!isLocal && !process.argv.includes("--yes")) {
    console.error(
      `La base de datos (${host}) no es local. Este comando BORRA los datos de negocio.\n` +
        "Si estás seguro, ejecuta: npx tsx scripts/seed.ts --yes\n" +
        "(En PowerShell, `npm run db:seed -- --yes` no reenvía el flag.)",
    );
    process.exit(1);
  }

  const db = createDb(url, { max: 1 });
  const started = performance.now();
  try {
    const { seed, counts } = await resetDatabase(db);
    const ms = Math.round(performance.now() - started);
    console.log(`Semilla ${seed} cargada en ${host} en ${ms} ms:`, counts);
  } finally {
    await db.$client.end();
  }
}

main().catch((error: unknown) => {
  console.error("Error al cargar la semilla:", error);
  process.exit(1);
});
