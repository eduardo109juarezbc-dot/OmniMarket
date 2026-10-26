import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatRelativeDate,
  fromCents,
  toCents,
} from "@/lib/format";

/** Intl usa espacios duros (U+00A0, U+202F); se normalizan para comparar. */
const plain = (value: string) => value.replace(/\s/g, " ");

describe("formatCurrency", () => {
  it("formatea céntimos según moneda y locale", () => {
    // Por defecto: USD y es-ES (fijados en vitest.config.ts).
    expect(plain(formatCurrency(123_450))).toBe("1234,50 US$");
    expect(plain(formatCurrency(123_456_789))).toBe("1.234.567,89 US$");
    expect(plain(formatCurrency(123_450, { currency: "EUR" }))).toBe("1234,50 €");
    expect(formatCurrency(123_450, { locale: "en-US", currency: "USD" })).toBe("$1,234.50");
  });

  it("maneja negativos, cero y céntimos sueltos", () => {
    expect(plain(formatCurrency(-1_234))).toBe("-12,34 US$");
    expect(plain(formatCurrency(0))).toBe("0,00 US$");
    expect(plain(formatCurrency(-0))).toBe("0,00 US$");
    expect(plain(formatCurrency(5))).toBe("0,05 US$");
    expect(plain(formatCurrency(1))).toBe("0,01 US$");
  });
});

describe("toCents y fromCents", () => {
  it("convierte sin errores de coma flotante y redondea mitad lejos de cero", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(19.99)).toBe(1_999);
    // 19.995 * 100 = 1999.4999… en binario; el resultado correcto es 2000.
    expect(toCents(19.995)).toBe(2_000);
    expect(toCents(1.005)).toBe(101);
    expect(toCents(-1.005)).toBe(-101);
    expect(toCents(0)).toBe(0);
    expect(Object.is(toCents(-0.001), 0)).toBe(true);
    expect(fromCents(1_999)).toBe(19.99);
    expect(toCents(fromCents(123_456))).toBe(123_456);
    expect(() => toCents(Number.NaN)).toThrow(RangeError);
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe("formatPercent, formatDate y formatRelativeDate", () => {
  it("formatea porcentajes y fechas en español de forma determinista", () => {
    expect(plain(formatPercent(37.25))).toBe("37,3 %");
    expect(plain(formatPercent(0))).toBe("0 %");

    // Zona horaria fija (UTC): el mismo resultado en servidor y cliente.
    expect(formatDate("2026-10-25T23:30:00.000Z")).toBe("25 oct 2026");

    const now = new Date("2026-10-25T12:00:00.000Z");
    expect(formatRelativeDate("2026-10-22T12:00:00.000Z", now)).toBe("hace 3 días");
    expect(formatRelativeDate("2026-10-24T12:00:00.000Z", now)).toBe("ayer");
    expect(formatRelativeDate("2026-10-25T10:00:00.000Z", now)).toBe("hace 2 horas");
    expect(formatRelativeDate("2026-10-25T11:59:30.000Z", now)).toBe("este minuto");
  });
});
