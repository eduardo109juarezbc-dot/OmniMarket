import { z } from "zod";

/**
 * Configuración pública (disponible en cliente y servidor).
 *
 * Las variables NEXT_PUBLIC_* se leen con acceso literal a `process.env.X`
 * para que Next.js pueda inyectarlas en el bundle del cliente.
 */

const DEFAULT_CURRENCY = "USD";
const DEFAULT_LOCALE = "es-ES";

function pickCurrency(value: string | undefined): string {
  return value && /^[A-Z]{3}$/.test(value) ? value : DEFAULT_CURRENCY;
}

function pickLocale(value: string | undefined): string {
  if (!value) return DEFAULT_LOCALE;
  try {
    return Intl.getCanonicalLocales(value)[0] ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

const DEFAULT_TIME_ZONE = "UTC";

function pickTimeZone(value: string | undefined): string {
  if (!value) return DEFAULT_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/**
 * Formato de importes y fechas. Siempre tiene un valor válido, aunque falten
 * las variables. La zona horaria es fija (no la del navegador) para que el HTML
 * del servidor y el del cliente coincidan al hidratar.
 */
export const appConfig = {
  currency: pickCurrency(process.env.NEXT_PUBLIC_CURRENCY),
  locale: pickLocale(process.env.NEXT_PUBLIC_LOCALE),
  timeZone: pickTimeZone(process.env.NEXT_PUBLIC_TIME_ZONE),
} as const;

const supabasePublicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "Debe ser una URL válida" }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, "Es obligatoria"),
});

export type SupabasePublicEnv = z.infer<typeof supabasePublicSchema>;

let cachedSupabaseEnv: SupabasePublicEnv | undefined;

/**
 * Credenciales públicas de Supabase. Se validan al primer uso y lanzan un
 * error explícito si faltan, en lugar de fallar más tarde con un mensaje opaco.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  if (cachedSupabaseEnv) return cachedSupabaseEnv;

  const parsed = supabasePublicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `Configuración pública de Supabase inválida:\n${z.prettifyError(parsed.error)}`,
    );
  }

  cachedSupabaseEnv = parsed.data;
  return cachedSupabaseEnv;
}
