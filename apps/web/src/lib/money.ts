// Los importes viajan como enteros de céntimos (ADR 0002) y solo se pasan a texto
// al pintarlos. La parte entera y los céntimos se separan con aritmética de enteros,
// así que ningún importe pasa por un decimal de coma flotante.

export type Currency = "VES" | "USD";

const SYMBOLS: Record<Currency, string> = { VES: "Bs", USD: "$" };
const thousands = new Intl.NumberFormat("es-VE", { maximumFractionDigits: 0 });

// El menos tipográfico (U+2212) y no el guion, como pide el design system.
const MINUS = "−";

export interface FormatMoneyOptions {
  // Un movimiento lleva siempre su signo, también el «+»; un saldo, solo el menos.
  signed?: boolean;
}

export function formatMoney(
  cents: number,
  currency: Currency,
  { signed = false }: FormatMoneyOptions = {},
): string {
  if (!Number.isSafeInteger(cents)) throw new Error(`importe no entero: ${cents}`);
  const absolute = Math.abs(cents);
  const whole = thousands.format(Math.floor(absolute / 100));
  const fraction = String(absolute % 100).padStart(2, "0");
  const sign = cents < 0 ? MINUS : signed && cents > 0 ? "+" : "";
  return `${sign}${SYMBOLS[currency]} ${whole},${fraction}`;
}
