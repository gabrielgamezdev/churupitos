import type { Currency } from "@/lib/money";

type SummaryEntry = { accountId: string; envelopeId: string; amountCents: number; isFee: boolean };

export type OperationSummary = {
  // Lo que movió en cada moneda, en el orden en que aparece: nunca se suman entre sí (R1).
  totals: { currency: Currency; cents: number }[];
  accountIds: string[];
  // Los sobres del gasto o del ingreso; el de la comisión solo si no hay otro (R16).
  envelopeIds: string[];
};

// Una operación en una fila: cuánto, de qué cuentas y de qué sobres. Una cuenta que no
// se conoce (no cargó) no suma en ninguna moneda.
export function summarizeOperation(
  entries: SummaryEntry[],
  currencyOf: (accountId: string) => Currency | undefined,
): OperationSummary {
  const totals = new Map<Currency, number>();
  for (const entry of entries) {
    const currency = currencyOf(entry.accountId);
    if (currency) totals.set(currency, (totals.get(currency) ?? 0) + entry.amountCents);
  }
  const unique = (ids: string[]) => [...new Set(ids)];
  const main = entries.filter((entry) => !entry.isFee);
  return {
    totals: [...totals].map(([currency, cents]) => ({ currency, cents })),
    accountIds: unique(entries.map((entry) => entry.accountId)),
    envelopeIds: unique((main.length > 0 ? main : entries).map((entry) => entry.envelopeId)),
  };
}
