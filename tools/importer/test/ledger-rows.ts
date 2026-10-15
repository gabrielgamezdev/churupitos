// Filas de libro inventadas, ya leídas, para probar lo que viene después del lector
// sin pasar por un Excel.

import type { LedgerRow } from "../src/ledger-sheet.ts";
import type { Currency } from "../src/money.ts";

// [fecha, sobre, concepto, céntimos]. Las filas se numeran seguidas desde la 4, como
// en las hojas de verdad.
export type RowSpec = [date: string, envelope: string, description: string, cents: number];

export function sheetRows(account: string, specs: RowSpec[], firstRow = 4): LedgerRow[] {
  return specs.map(([date, envelope, description, amountCents], i) => ({
    sheet: account.toUpperCase(),
    account,
    row: firstRow + i,
    date,
    dateApproximate: false,
    dateText: null,
    envelopeText: envelope,
    envelope,
    description,
    amountCents,
    amountFormula: null,
    balanceCents: null,
    isCarry: description.startsWith("Lo que tenía antes"),
  }));
}

const currencies: Record<string, Currency> = {
  "Banco A": "VES",
  "Banco C": "VES",
  "Billetera B": "USD",
};
export const currencyOf = (account: string) => currencies[account]!;
