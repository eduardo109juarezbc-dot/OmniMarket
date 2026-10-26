import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** Cabecera que protege POST /api/test/reset-data (Requisito 6.2). */
export const TEST_TOKEN_HEADER = "x-test-token";

/**
 * Compara dos secretos en tiempo constante. Se comparan sus hashes SHA-256
 * (siempre 32 bytes), así que tampoco se filtra la longitud del secreto.
 */
export function safeEqual(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
