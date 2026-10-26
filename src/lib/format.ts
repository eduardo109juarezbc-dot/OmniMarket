import { appConfig } from "./config";

/**
 * Formateadores únicos de la app (Requisito 9.6). Las instancias de Intl son
 * costosas de crear, así que se guardan en caché por combinación de opciones.
 */

type MoneyOptions = { currency?: string; locale?: string };

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(locale: string, currency: string): Intl.NumberFormat {
  const key = `${locale}|${currency}`;
  let formatter = currencyFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(key, formatter);
  }
  return formatter;
}

/** Convierte un importe en unidades mayores (p. ej. 19.99) a céntimos enteros. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError(`Importe no válido: ${amount}`);
  }
  // Desplazar la coma con notación exponencial evita el error binario de
  // `amount * 100` (19.995 * 100 = 1999.4999…). Redondeo: mitad lejos de cero.
  const abs = Math.abs(amount);
  const shifted = Number(`${abs}e2`);
  const cents = Math.round(Number.isFinite(shifted) ? shifted : abs * 100);
  return amount < 0 && cents !== 0 ? -cents : cents;
}

/** Convierte céntimos a unidades mayores (para JSON y formularios). */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Formatea céntimos como moneda: formatCurrency(123450) → "1234,50 US$" (es-ES). */
export function formatCurrency(cents: number, options: MoneyOptions = {}): string {
  const locale = options.locale ?? appConfig.locale;
  const currency = options.currency ?? appConfig.currency;
  // `|| 0` normaliza -0 para no mostrar "-0,00".
  return currencyFormatter(locale, currency).format(fromCents(cents) || 0);
}

const percentFormatters = new Map<string, Intl.NumberFormat>();

/** Formatea un porcentaje expresado en 0–100: formatPercent(37.25) → "37,3 %". */
export function formatPercent(value: number, locale: string = appConfig.locale): string {
  let formatter = percentFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "percent",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    percentFormatters.set(locale, formatter);
  }
  return formatter.format(value / 100 || 0);
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

/** Fecha corta: "25 oct 2026". Usa la zona horaria fija de la app. */
export function formatDate(
  date: Date | string,
  { locale = appConfig.locale, timeZone = appConfig.timeZone } = {},
): string {
  const key = `${locale}|${timeZone}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone });
    dateFormatters.set(key, formatter);
  }
  return formatter.format(typeof date === "string" ? new Date(date) : date);
}

const RELATIVE_UNITS: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();

/**
 * Antigüedad relativa en español: "hace 3 días", "ayer", "hace 2 horas".
 * `now` es explícito para que el resultado sea determinista (tests e hidratación).
 */
export function formatRelativeDate(
  date: Date | string,
  now: Date,
  locale: string = appConfig.locale,
): string {
  let formatter = relativeFormatters.get(locale);
  if (!formatter) {
    formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    relativeFormatters.set(locale, formatter);
  }

  const target = typeof date === "string" ? new Date(date) : date;
  const diffSeconds = (target.getTime() - now.getTime()) / 1000;

  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.trunc(diffSeconds / seconds), unit);
    }
  }
  return formatter.format(0, "minute");
}

/** Importe en unidades mayores (formato de la API JSON): formatMoney(19.99) → "19,99 US$". */
export function formatMoney(amount: number, options: MoneyOptions = {}): string {
  return formatCurrency(toCents(amount), options);
}

const compactFormatters = new Map<string, Intl.NumberFormat>();

/** Importe abreviado para ejes de gráficos: 12500 → "12,5 mil US$". */
export function formatCompactMoney(amount: number, options: MoneyOptions = {}): string {
  const locale = options.locale ?? appConfig.locale;
  const currency = options.currency ?? appConfig.currency;
  const key = `${locale}|${currency}`;
  let formatter = compactFormatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    });
    compactFormatters.set(key, formatter);
  }
  return formatter.format(amount || 0);
}

/** Día y mes para ejes: "2026-10-05" → "5 oct". La fecha se interpreta en UTC. */
export function formatDayMonth(isoDate: string, locale: string = appConfig.locale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`));
}

/** Hora con segundos en la zona horaria de la app: "18:45:12". */
export function formatTime(
  date: Date | string,
  { locale = appConfig.locale, timeZone = appConfig.timeZone } = {},
): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: "medium", timeZone }).format(
    typeof date === "string" ? new Date(date) : date,
  );
}
