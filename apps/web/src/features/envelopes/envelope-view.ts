import type { AccountBalance } from "@/features/balances/use-account-balances";
import type { MonthBounds } from "@/features/ledger/month-picker";
import type { LedgerEntry } from "@/features/ledger/queries";
import type { Currency } from "@/lib/money";

import type { EnvelopeBalance, EnvelopeCell } from "./queries";

const CURRENCIES: Currency[] = ["VES", "USD"];

export type EnvelopeCellRow = { account: AccountBalance; balanceCents: number };

// En qué cuentas está el dinero de un sobre: solo las que tienen algo (o deben), en el
// orden de las hojas del Excel, que es el de `accounts`.
export function envelopeCellRows(
  cells: EnvelopeCell[],
  accounts: AccountBalance[],
): EnvelopeCellRow[] {
  const byAccount = new Map(cells.map((cell) => [cell.accountId, cell.balanceCents]));
  return accounts.flatMap((account) => {
    const balanceCents = byAccount.get(account.accountId) ?? 0;
    return balanceCents === 0 ? [] : [{ account, balanceCents }];
  });
}

// Lo que tiene un sobre en cada moneda según una lista de saldos, sin las que están en cero.
export function envelopeAmounts(
  envelopeId: string,
  balances: EnvelopeBalance[],
): { currency: Currency; balanceCents: number }[] {
  return CURRENCIES.flatMap((currency) => {
    const found = balances.find((b) => b.envelopeId === envelopeId && b.currency === currency);
    return found && found.balanceCents !== 0
      ? [{ currency, balanceCents: found.balanceCents }]
      : [];
  });
}

// Las monedas que enseña el mes de un sobre: las que tienen algo al empezar o al
// cerrar, o algún movimiento. Sin definir mientras carga cada lista.
export function envelopeMonthBounds(
  envelopeId: string,
  opening: EnvelopeBalance[] | undefined,
  closing: EnvelopeBalance[] | undefined,
  entries: LedgerEntry[] | undefined,
): MonthBounds[] {
  const amount = (list: EnvelopeBalance[] | undefined, currency: Currency) =>
    list &&
    (list.find((b) => b.envelopeId === envelopeId && b.currency === currency)?.balanceCents ?? 0);
  return CURRENCIES.filter(
    (currency) =>
      (amount(opening, currency) ?? 0) !== 0 ||
      (amount(closing, currency) ?? 0) !== 0 ||
      (entries ?? []).some((entry) => entry.currency === currency),
  ).map((currency) => ({
    currency,
    openingCents: amount(opening, currency),
    closingCents: amount(closing, currency),
  }));
}
