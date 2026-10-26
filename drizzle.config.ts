import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Mismo orden de prioridad que Next.js: .env.local sobrescribe a .env.
config({ path: [".env.local", ".env"], quiet: true });

/**
 * Las migraciones usan el pooler en modo sesión (puerto 5432): el modo
 * transacción no admite las sentencias de DDL que ejecuta drizzle-kit.
 * `generate` no se conecta, así que no exige la variable.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT ?? "",
  },
  // Tabla de control de migraciones fuera de `public` (no se expone por la Data API).
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
  strict: true,
  verbose: true,
});
