import type { OverdrawnCell } from "@/features/accounts/queries";
import { daysBetween } from "@/features/debts/debt-view";
import type { ExpectedIncome } from "@/features/budget/queries";
import type { Debt } from "@/features/debts/queries";

// Cuántos días antes de vencer una cuota sale en Inicio.
export const DUE_SOON_DAYS = 7;

// Las monedas, siempre en el mismo orden y nunca mezcladas (R1).
const CURRENCY_ORDER = { VES: 0, USD: 1 } as const;

// Lo que Inicio pone a revisar (M7): los sobres en descubierto, por moneda y del más
// hondo al menos, y lo que deben que ya venció o vence en `DUE_SOON_DAYS` días, por
// fecha. Lo que les deben no: eso no se paga.
export function attention(cells: OverdrawnCell[], debts: Debt[], today: string) {
  const overdrafts = cells
    .filter((cell) => cell.balanceCents < 0)
    .sort(
      (a, b) =>
        CURRENCY_ORDER[a.currency] - CURRENCY_ORDER[b.currency] || a.balanceCents - b.balanceCents,
    );
  const dueSoon = debts
    .filter(
      (debt) =>
        debt.direction === "payable" &&
        debt.paidOn === null &&
        debt.dueOn !== null &&
        daysBetween(today, debt.dueOn) <= DUE_SOON_DAYS,
    )
    .sort((a, b) => (a.dueOn ?? "").localeCompare(b.dueOn ?? "") || a.position - b.position);
  return { overdrafts, dueSoon };
}

// Los ingresos esperados del mes que siguen sin cobrar (M9): en Inicio son una sola línea,
// con cuántos son y lo que suman en dólares, no una por ingreso, que serían siete todo el
// mes. Sin ninguno, null.
export function incomesToReceive(incomes: ExpectedIncome[]) {
  const pending = incomes.filter((income) => income.receipt === null);
  if (pending.length === 0) return null;
  return {
    count: pending.length,
    usdCents: pending.reduce((sum, income) => sum + income.expectedUsdCents, 0),
  };
}
