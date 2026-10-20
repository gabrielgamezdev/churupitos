// Lo que se teclea en un campo de monto, en céntimos (ADR 0002). Se lee como texto y
// con enteros, sin pasar nunca por un decimal de coma flotante.
//
// Acepta lo que se escribe en Venezuela y lo que pone un teclado en inglés:
// «1.234,56», «1234,56», «1234.56» o «1234». barrido:permitido (formatos de ejemplo)
// Un solo punto seguido de tres cifras es de miles («1.234»); con una o dos, de
// decimales («12.50»). Más de dos decimales, letras o un cero no son un monto.
export function parseAmountInput(text: string): number | null {
  const clean = text.replace(/[\s$]|Bs/g, "");
  if (!/^[\d.,]+$/.test(clean) || !/\d/.test(clean)) return null;

  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  let decimalAt = Math.max(lastComma, lastDot);
  if (lastComma === -1 && lastDot !== -1) {
    // Solo puntos: de miles si hay varios o si el último lleva tres cifras detrás.
    const dots = clean.split(".").length - 1;
    if (dots > 1 || clean.length - lastDot - 1 === 3) decimalAt = -1;
  } else if (lastComma !== -1 && clean.split(",").length - 1 > 1) {
    return null;
  }

  const whole = (decimalAt === -1 ? clean : clean.slice(0, decimalAt)).replace(/[.,]/g, "");
  const fraction = decimalAt === -1 ? "" : clean.slice(decimalAt + 1);
  if (fraction.length > 2 || /[.,]/.test(fraction)) return null;

  const cents = Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

// Un importe como se teclearía, para volver a enseñarlo en un formulario: sin signo, sin
// separador de miles y con coma («1500,00»), que `parseAmountInput` lee igual.
export function amountInputText(cents: number): string {
  const absolute = Math.abs(cents);
  return `${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, "0")}`;
}
