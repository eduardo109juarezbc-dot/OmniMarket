/**
 * Cliente HTTP tipado para la API privada (/api/*), usado por los hooks de
 * TanStack Query. Normaliza los errores en ApiError para que las mutaciones
 * optimistas puedan revertir y mostrar un toast con el mensaje del servidor.
 */
import type { ApiErrorBody } from "./api-types";
import { loginPathFor } from "./auth";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Mensaje del campo indicado (para mostrar junto al input). */
  fieldError(path: string): string | undefined {
    return this.details.find((detail) => detail.path === path)?.message;
  }
}

type ApiInit = Omit<RequestInit, "body"> & {
  /** Cuerpo a serializar como JSON. */
  json?: unknown;
  /** Query string; los valores undefined, null o "" se omiten. */
  query?: Record<string, string | number | boolean | null | undefined>;
};

export function withQuery(path: string, query: ApiInit["query"] = {}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function isErrorBody(body: unknown): body is ApiErrorBody {
  return typeof body === "object" && body !== null && "error" in body;
}

export async function apiFetch<T>(
  path: string,
  { json, query, headers, ...init }: ApiInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(withQuery(path, query), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(json === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: json === undefined ? undefined : JSON.stringify(json),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(
      0,
      "NETWORK",
      "No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.",
    );
  }

  if (response.status === 204) return undefined as T;

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      // Sesión caducada: vuelve al login recordando la página actual.
      window.location.assign(loginPathFor(window.location.pathname, window.location.search));
    }
    if (isErrorBody(body)) {
      throw new ApiError(
        response.status,
        body.error.code,
        body.error.message,
        body.error.details ?? [],
      );
    }
    throw new ApiError(response.status, "HTTP_ERROR", "Ha ocurrido un error inesperado");
  }

  return body as T;
}
