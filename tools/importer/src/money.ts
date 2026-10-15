// De los números del Excel a céntimos enteros (ADR 0002), una sola vez y al leer.

export type Currency = "VES" | "USD";

// El Excel guarda los importes como coma flotante, con ruido (4733.020000000002) o
// con una docena de decimales cuando se pegó un cálculo como valor. Se redondea
// sobre la representación decimal más corta del número, que es la que se ve en la
// celda, y no sobre su valor binario: 1.005 da 101 céntimos, como ROUND en el
// Excel, y no 100. La mitad se aleja del cero, como `round()` de Postgres.
export function toCents(value: number): number {
  if (!Number.isFinite(value)) throw new Error(`importe no numérico: ${value}`);
  const text = Math.abs(value).toString();
  // Notación exponencial: solo aparece en el ruido diminuto o en cifras
  // imposibles para un hogar, así que ahí basta el redondeo binario.
  if (text.includes("e")) return Math.sign(value) * Math.round(Math.abs(value) * 100);
  const [whole = "0", fraction = ""] = text.split(".");
  const padded = fraction.padEnd(3, "0");
  const cents = Number(whole) * 100 + Number(padded.slice(0, 2)) + (padded[2]! >= "5" ? 1 : 0);
  if (!Number.isSafeInteger(cents)) throw new Error(`importe fuera de rango: ${value}`);
  return value < 0 ? -cents : cents;
}

// Un importe escrito como texto, que pasa sobre todo en las listas de deudas:
// «20 USDT», «3000bs», «$10,00». Devuelve también la moneda si el texto la dice.
// En la notación venezolana el punto separa miles y la coma, decimales:
// «2.000,00». barrido:permitido (cifra inventada: es la notación lo que se cita)
export function parseAmountText(text: string): { cents: number; currency: Currency | null } | null {
  const match = /-?\d[\d.,]*/.exec(text);
  if (!match) return null;
  let digits = match[0];
  if (digits.includes(",")) digits = digits.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}(\.|$)/.test(digits)) digits = digits.replace(/\./g, "");
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  return { cents: toCents(value), currency: currencyFromText(text) };
}

// La moneda que dice un texto o un formato de número: `[$Bs]#,##0.00`, `"BsF"`,
// `[$$]#,##0.00`, «USDT», «3000bs».
export function currencyFromText(text: string | undefined): Currency | null {
  if (!text) return null;
  if (/bs/i.test(text)) return "VES";
  if (/\$|usd/i.test(text)) return "USD";
  return null;
}
