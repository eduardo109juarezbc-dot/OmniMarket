import "server-only";
import { z } from "zod";

/** Trata los valores vacíos ("") como no definidos; Vercel y CI a veces los envían así. */
const optionalSecret = (min: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(min, `Debe tener al menos ${min} caracteres`).optional(),
  );

const postgresUrl = z
  .string({ message: "Es obligatoria" })
  .regex(/^postgres(ql)?:\/\//, "Debe empezar por postgres:// o postgresql://");

const serverSchema = z.object({
  /** Pooler de Supabase en modo transacción (puerto 6543). */
  DATABASE_URL: postgresUrl,
  /** Protege POST /api/test/reset-data. Si falta, el endpoint responde 503. */
  TEST_API_TOKEN: optionalSecret(16),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

/**
 * Variables de entorno del servidor. Se validan al primer uso y lanzan un error
 * explícito si son inválidas. Nunca se envían al cliente (`server-only`).
 */
export function serverEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Variables de entorno del servidor inválidas:\n${z.prettifyError(parsed.error)}`,
    );
  }

  cached = parsed.data;
  return cached;
}
