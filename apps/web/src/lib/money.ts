// Los importes viajan como enteros de céntimos (ADR 0002) y solo se pasan a texto
// al pintarlos. La parte entera y los céntimos se separan con aritmética de enteros,
// así que ningún importe pasa por un decimal de coma flotante.

export type Currency = "VES" | "USD";

const SYMBOLS: Record<Currency, string> = { VES: "Bs", USD: "$" };

export const CURRENCY_NAMES: Record<Currency, string> = { VES: "Bolívares", USD: "Dólares" };

// Cada moneda en la dirección de su pantalla: /currencies/ves.
export function currencySlug(currency: Currency): string {
  return currency.toLowerCase();
}

export function currencyFromSlug(slug: string): Currency | null {
  const code = slug.toUpperCase();
  return code === "VES" || code === "USD" ? code : null;
}
const thousands = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });

// El menos tipográfico (U+2212) y no el guion, como pide el design system.
const MINUS = "−";

export interface FormatMoneyOptions {
  // Un movimiento lleva siempre su signo, también el «+»; un saldo, solo el menos.
  signed?: boolean;
}

// La cifra sola, sin signo ni símbolo, con punto de miles y coma decimal. Es también lo
// que se ve en un campo de monto mientras se escribe.
export function formatAmount(cents: number): string {
  if (!Number.isSafeInteger(cents)) throw new Error(`importe no entero: ${cents}`);
  const absolute = Math.abs(cents);
  const whole = thousands.format(Math.floor(absolute / 100));
  const fraction = String(absolute % 100).padStart(2, "0");
  return `${whole},${fraction}`;
}

export function formatMoney(
  cents: number,
  currency: Currency,
  { signed = false }: FormatMoneyOptions = {},
): string {
  const sign = cents < 0 ? MINUS : signed && cents > 0 ? "+" : "";
  return `${sign}${SYMBOLS[currency]} ${formatAmount(cents)}`;
}

// La tasa de un cobro (R8) o de un cambio de divisa: los Bs por cada dólar, con dos
// decimales como en el Excel. Solo se pinta; nunca se usa para calcular un importe. Se
// redondea en centésimas con enteros, sin pasar por un decimal.
export function formatRate(vesCents: number, usdCents: number): string {
  const hundredths = Math.round((vesCents * 100) / usdCents);
  const whole = thousands.format(Math.floor(hundredths / 100));
  return `${whole},${String(hundredths % 100).padStart(2, "0")}`;
}
