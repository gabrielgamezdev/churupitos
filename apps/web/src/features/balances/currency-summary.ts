import { formatMoney, type Currency } from "@/lib/money";

// La línea de debajo del saldo de una moneda, en el inicio y en su pantalla: el total
// con «Otro» si lo hay (R11) y cuántas cuentas tiene.
export function currencyDetails(
  currency: Currency,
  totalCents: number,
  thirdPartyCents: number,
  accountCount: number,
): string {
  const parts = [accountCount === 1 ? "1 cuenta" : `${accountCount} cuentas`];
  if (thirdPartyCents !== 0) parts.unshift(`Con «Otro»: ${formatMoney(totalCents, currency)}`);
  return parts.join(" · ");
}
