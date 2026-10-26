/**
 * Reglas de autenticación compartidas por el proxy, el callback OAuth y la UI.
 * Lógica pura: sin dependencias de Next.js ni de Supabase.
 */

export const OAUTH_PROVIDERS = ["google", "github"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
};

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === "string" && (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export const LOGIN_PATH = "/login";
export const DEFAULT_AFTER_LOGIN = "/dashboard";

/** Rutas accesibles sin sesión (además de /auth/* y /api/test/*, excluidas en el matcher). */
const PUBLIC_PATHS = new Set<string>([LOGIN_PATH, "/privacidad", "/terminos"]);

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}

/**
 * Valida el destino tras el login (parámetro `next`) para evitar redirecciones
 * abiertas (Requisito 2.6). Solo acepta rutas internas absolutas: "/orders?x=1".
 * Rechaza "//evil.com", "/\\evil.com", "https://…", rutas de auth y caracteres de control.
 */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || next.length > 512) return DEFAULT_AFTER_LOGIN;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return DEFAULT_AFTER_LOGIN;
  }
  // Caracteres de control y barras invertidas, también codificados (%0d, %5c…):
  // algunos navegadores normalizan "\" a "/", y CR/LF no tienen sentido en una ruta.
  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  const unsafeChars = /[\u0000-\u001f\u007f\\]/;
  if (unsafeChars.test(next) || unsafeChars.test(decoded) || decoded.startsWith("//")) {
    return DEFAULT_AFTER_LOGIN;
  }

  let url: URL;
  try {
    // Base ficticia: si `next` consiguiera cambiar el origen, se descarta.
    url = new URL(next, "http://omnimarket.invalid");
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  if (url.origin !== "http://omnimarket.invalid") return DEFAULT_AFTER_LOGIN;
  if (url.pathname === LOGIN_PATH || url.pathname.startsWith("/auth/")) return DEFAULT_AFTER_LOGIN;

  return `${url.pathname}${url.search}`;
}

/** Ruta de login que recuerda a dónde volver. */
export function loginPathFor(pathname: string, search = ""): string {
  const next = sanitizeNextPath(`${pathname}${search}`);
  return next === DEFAULT_AFTER_LOGIN && pathname !== DEFAULT_AFTER_LOGIN
    ? LOGIN_PATH
    : `${LOGIN_PATH}?next=${encodeURIComponent(next)}`;
}

/** Códigos de error que /login sabe mostrar. El texto nunca viene de la URL. */
export const LOGIN_ERRORS = {
  oauth: "El proveedor canceló o rechazó el inicio de sesión. Inténtalo de nuevo.",
  callback: "No se pudo completar el inicio de sesión. Inténtalo de nuevo.",
  session: "Tu sesión ha caducado. Inicia sesión otra vez.",
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERRORS;

export function loginErrorMessage(code: string | null | undefined): string | null {
  // Object.hasOwn: `"toString" in LOGIN_ERRORS` sería true por el prototipo.
  return code && Object.hasOwn(LOGIN_ERRORS, code) ? LOGIN_ERRORS[code as LoginErrorCode] : null;
}

/** Datos del operador que muestra la cabecera (Requisito 2.8). */
export type SessionUser = {
  id: string;
  email: string | null;
  name: string;
  avatarUrl: string | null;
  provider: OAuthProvider | null;
};

type ClaimsLike = {
  sub: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
};

/**
 * Cookie con el proveedor usado en el último login. Supabase vincula Google y
 * GitHub al mismo usuario si comparten email, y `app_metadata.provider` guarda
 * siempre el primero; esta cookie permite mostrar el de la sesión actual.
 * Solo es una etiqueta de la UI: nunca se usa para autorizar.
 */
export const PROVIDER_COOKIE = "om_provider";

/** Proveedor de la identidad con el inicio de sesión más reciente. */
export function latestIdentityProvider(
  identities: readonly { provider: string; last_sign_in_at?: string | null }[] | null | undefined,
): OAuthProvider | null {
  let latest: { provider: OAuthProvider; time: number } | null = null;
  for (const identity of identities ?? []) {
    if (!isOAuthProvider(identity.provider)) continue;
    const time = identity.last_sign_in_at ? Date.parse(identity.last_sign_in_at) : Number.NaN;
    if (Number.isNaN(time)) continue;
    if (!latest || time > latest.time) latest = { provider: identity.provider, time };
  }
  return latest?.provider ?? null;
}

/**
 * Proveedor a mostrar: el de la cookie si es uno de los vinculados al usuario
 * (según el JWT firmado); si no, el original de la cuenta.
 */
export function resolveSessionProvider(
  appMetadata: Record<string, unknown> | undefined,
  cookieValue: string | null | undefined,
): OAuthProvider | null {
  const linked = Array.isArray(appMetadata?.providers) ? (appMetadata.providers as unknown[]) : [];
  if (isOAuthProvider(cookieValue) && linked.includes(cookieValue)) return cookieValue;
  const original = appMetadata?.provider;
  return isOAuthProvider(original) ? original : null;
}

function pickString(source: Record<string, unknown> | undefined, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * Normaliza los claims del JWT de Supabase (Google y GitHub usan claves distintas).
 * `providerCookie` es el valor de PROVIDER_COOKIE, si existe.
 */
export function sessionUserFromClaims(
  claims: ClaimsLike,
  providerCookie?: string | null,
): SessionUser {
  const metadata = claims.user_metadata;
  const email = claims.email ?? pickString(metadata, "email");
  return {
    id: claims.sub,
    email,
    name:
      pickString(metadata, "full_name", "name", "user_name", "preferred_username") ??
      email?.split("@")[0] ??
      "Operador",
    avatarUrl: pickString(metadata, "avatar_url", "picture"),
    provider: resolveSessionProvider(claims.app_metadata, providerCookie),
  };
}
