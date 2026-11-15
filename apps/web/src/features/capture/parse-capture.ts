// Lo que se saca del texto de una captura de pago (M15): el monto, la fecha, el concepto y
// la cuenta. Sin reglas de ningún banco: el repositorio es público, y cada banco cambia su
// captura cuando quiere. Se buscan las etiquetas que usan todos («Monto», «Fecha»,
// «Concepto») y, si no, la forma de cada dato; la cuenta, por lo que cada una guarda en la
// base. Lo que no se encuentra queda en null: no se adivina.
//
// Una factura en papel (la foto de una) es otra cosa: su monto es el total, que va al
// final; su concepto, «Factura», que se cambia a mano; y no dice con qué se pagó.

export interface CaptureFields {
  amountCents: number | null;
  // AAAA-MM-DD.
  day: string | null;
  description: string | null;
  accountId: string | null;
  // Es una factura: la cuenta no se elige sola.
  receipt: boolean;
}

export const RECEIPT_DESCRIPTION = "Factura";
// Lo que dice una factura y no una captura de un pago.
const RECEIPT_MARK = /\b(factura|seniat|iva|subtotal|subttl)\b/;

// Una cuenta y lo que la delata en sus capturas: sus últimos dígitos o una palabra.
export interface CaptureAccount {
  accountId: string;
  hints: string[];
}

// Sin tildes y en minúsculas: el lector a veces se come una tilde, o la pone de más.
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function parseCapture(
  text: string,
  today: string,
  accounts: CaptureAccount[] = [],
): CaptureFields {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const receipt = RECEIPT_MARK.test(fold(text));
  return {
    amountCents: amountOf(lines, receipt),
    day: dayOf(lines, today),
    description: receipt ? RECEIPT_DESCRIPTION : descriptionOf(lines),
    accountId: receipt ? null : accountOf(lines, accounts),
    receipt,
  };
}

// --- La cuenta -----------------------------------------------------------------------

// Dónde aparece por primera vez, como palabra o cifra entera: «1234» está en «***1234» o
// en «Cta. 1234», pero no dentro de «912345».
function firstAt(text: string, hint: string): number {
  const folded = fold(hint.trim());
  if (!folded) return -1;
  const escaped = folded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.search(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "u"));
}

// La cuenta de origen sale antes que la de destino en las capturas: gana la que aparece
// primero. Si dos aparecen en el mismo sitio, no se sabe cuál es: ninguna.
function accountOf(lines: string[], accounts: CaptureAccount[]): string | null {
  const text = fold(lines.join("\n"));
  const found = accounts
    .map(({ accountId, hints }) => ({
      accountId,
      at: Math.min(
        ...hints.map((hint) => firstAt(text, hint)).filter((at) => at >= 0),
        Number.POSITIVE_INFINITY,
      ),
    }))
    .filter(({ at }) => Number.isFinite(at))
    .sort((a, b) => a.at - b.at);
  const [first, second] = found;
  if (!first || (second && second.at === first.at)) return null;
  return first.accountId;
}

// --- El monto ------------------------------------------------------------------------

// Con coma decimal y puntos de miles, como en los bancos de aquí, o con punto decimal y
// comas de miles, como en las apps en dólares. Con dos decimales, para no confundirlo con
// un teléfono, una cédula o una referencia; con más, solo si lo sigue un dólar cripto
// (USDT, USDC), que enseña hasta ocho: se toman los dos primeros, como al registrarlo a
// mano.
const AMOUNT_FORMATS = [
  { pattern: /(?<!\d|\d[.,])(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?!\d|[.,]\d)/g, thousands: /\./g },
  { pattern: /(?<!\d|\d[.,])(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})(?!\d|[.,]\d)/g, thousands: /,/g },
  {
    pattern: /(?<!\d|\d[.,])(\d{1,3}(?:\.\d{3})+|\d+),(\d{3,8})(?=\s*usd[tc]\b)/gi,
    thousands: /\./g,
  },
  {
    pattern: /(?<!\d|\d[.,])(\d{1,3}(?:,\d{3})+|\d+)\.(\d{3,8})(?=\s*usd[tc]\b)/gi,
    thousands: /,/g,
  },
];
const AMOUNT_LABEL = /\b(monto|importe|total)\b/;
const CURRENCY_MARK = /\b(bs|ves|usd|usdt)\b|\$/;
// Lo que también es una cifra con decimales pero no es lo que se pagó. En una factura,
// además, lo que se entregó en efectivo y el vuelto, que pueden pasar del total.
const NOT_THE_AMOUNT = /\b(saldo|disponible|comision|tasa)\b/;
const NOT_THE_RECEIPT_TOTAL = /\b(efectivo|cambio|vuelto)\b/;

function amountsIn(line: string): number[] {
  return AMOUNT_FORMATS.flatMap(({ pattern, thousands }) =>
    [...line.matchAll(pattern)].map(
      (match) =>
        Number((match[1] ?? "").replace(thousands, "")) * 100 +
        Number((match[2] ?? "").slice(0, 2)),
    ),
  ).filter((cents) => Number.isSafeInteger(cents) && cents > 0);
}

// La etiqueta va en la misma línea («Monto: Bs 10,00») o en la de encima, sola
// («Monto:» y debajo la cifra). De varias cifras gana la de etiqueta más clara y, a
// igualdad, la primera: la cifra grande de una captura va arriba. En una factura, la que
// lleva «Total» o, si no se leyó (en una foto pasa a menudo), la última: el total cierra
// la factura. La mayor no sirve: una cifra de arriba mal leída puede pasarla.
function amountOf(lines: string[], receipt: boolean): number | null {
  let best: { cents: number; rank: number } | null = null;
  for (const [index, line] of lines.entries()) {
    const amounts = amountsIn(line);
    if (amounts.length === 0) continue;
    const own = fold(line);
    // La de encima solo cuenta si es una etiqueta sola, sin cifra propia.
    const previous = lines[index - 1] ?? "";
    const above = amountsIn(previous).length === 0 ? fold(previous) : "";
    if (NOT_THE_AMOUNT.test(own) || NOT_THE_AMOUNT.test(above)) continue;
    if (receipt) {
      if (NOT_THE_RECEIPT_TOTAL.test(own) || NOT_THE_RECEIPT_TOTAL.test(above)) continue;
      const rank = /\btotal\b/.test(own) || /\btotal\b/.test(above) ? 1 : 0;
      if (!best || rank >= best.rank) best = { cents: amounts.at(-1) ?? 0, rank };
      continue;
    }
    const rank =
      AMOUNT_LABEL.test(own) || AMOUNT_LABEL.test(above) ? 2 : CURRENCY_MARK.test(own) ? 1 : 0;
    if (!best || rank > best.rank) best = { cents: amounts[0] ?? 0, rank };
  }
  return best?.cents ?? null;
}

// --- La fecha ------------------------------------------------------------------------

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
// En cada forma, qué grupo es el año, cuál el mes y cuál el día; y la hora, si es UTC.
const DATE_FORMATS: {
  pattern: RegExp;
  year: number;
  month: number;
  day: number;
  utcHour?: number;
}[] = [
  // 06/11/2026, 6-11-26 o 06.11.2026: primero el día, como aquí.
  { pattern: /(?<!\d)(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?!\d)/g, year: 3, month: 2, day: 1 },
  // 2026-11-06, como en las apps en dólares, que a veces dan la hora en UTC.
  {
    pattern:
      /(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)(?:[ t]+(\d{1,2}):\d{2}(?::\d{2})?\s*\(?\s*(utc))?/g,
    year: 1,
    month: 2,
    day: 3,
    utcHour: 4,
  },
  // 6 nov 2026, 6 de noviembre de 2026 o 6 nov., 2026.
  {
    pattern: new RegExp(
      `(?<!\\d)(\\d{1,2})\\s*(?:de\\s+)?(${MONTHS.join("|")})[a-z]*\\.?,?\\s*(?:de\\s+)?(\\d{4})(?!\\d)`,
      "g",
    ),
    year: 3,
    month: 2,
    day: 1,
  },
];

function validDay(
  yearText: string,
  monthText: string,
  dayText: string,
  today: string,
  dayBefore: boolean,
) {
  let month = /^\d+$/.test(monthText) ? Number(monthText) : MONTHS.indexOf(monthText) + 1;
  let day = Number(dayText);
  // 11/25/2026 solo puede ser mes y día: una app que escribe la fecha a la inglesa.
  if (month > 12 && day <= 12) [month, day] = [day, month];
  const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || year < 2000) return null;
  if (dayBefore) date.setUTCDate(date.getUTCDate() - 1);
  const iso = date.toISOString().slice(0, 10);
  // Un día que aún no llegó es una lectura mala: una captura es de algo ya pagado.
  return iso > today ? null : iso;
}

// Venezuela va 4 horas por detrás de UTC, todo el año: antes de las 4:00 en UTC, aquí aún
// era el día anterior.
const UTC_OFFSET_HOURS = 4;

function datesIn(line: string, today: string): string[] {
  const folded = fold(line);
  return DATE_FORMATS.flatMap((format) =>
    [...folded.matchAll(format.pattern)].map((match) => {
      const utcHour = format.utcHour === undefined ? undefined : match[format.utcHour];
      return validDay(
        match[format.year] ?? "",
        match[format.month] ?? "",
        match[format.day] ?? "",
        today,
        utcHour !== undefined && Number(utcHour) < UTC_OFFSET_HOURS,
      );
    }),
  ).filter((day): day is string => day !== null);
}

// La que lleva «Fecha» en su línea o en la de encima; si ninguna, la primera.
function dayOf(lines: string[], today: string): string | null {
  let first: string | null = null;
  for (const [index, line] of lines.entries()) {
    const [day] = datesIn(line, today);
    if (day === undefined) continue;
    const labelled = /\bfecha\b/.test(fold(line)) || /\bfecha\b/.test(fold(lines[index - 1] ?? ""));
    if (labelled) return day;
    first ??= day;
  }
  return first;
}

// --- El concepto ---------------------------------------------------------------------

const CONCEPT_LABEL = /^(concepto|descripcion|motivo)(?!\p{L})\s*[:.]?\s*/u;
// Lo que ponen los bancos cuando no se escribe nada: no dice de qué fue el gasto.
const SAYS_NOTHING = new Set(["pago", "pagos", "pago movil", "transferencia", "otros"]);
const MAX_DESCRIPTION = 80;

function descriptionOf(lines: string[]): string | null {
  for (const [index, line] of lines.entries()) {
    // Plegar no cambia la longitud de la línea compuesta: lo que sigue a la etiqueta se
    // corta de la original, con sus mayúsculas y sus tildes.
    const original = line.normalize("NFC");
    const label = CONCEPT_LABEL.exec(fold(original));
    if (!label) continue;
    const rest = original.slice(label[0].length).trim();
    const next = lines[index + 1];
    const value = rest || (next && !next.trim().endsWith(":") ? next : "");
    const cleaned = value.replace(/[\s.:;,-]+$/, "").trim();
    if (!/\p{L}/u.test(cleaned) || SAYS_NOTHING.has(fold(cleaned))) return null;
    return cleaned.slice(0, MAX_DESCRIPTION);
  }
  return null;
}
