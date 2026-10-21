import type { OverdrawnCell } from "@/features/accounts/queries";
import { daysBetween } from "@/features/debts/debt-view";
import type { Debt } from "@/features/debts/queries";

// Cuántos días antes de vencer una cuota sale en Inicio.
export const DUE_SOON_DAYS = 7;

// Las monedas, siempre en el mismo orden y nunca mezcladas (R1).
const CURRENCY_ORDER = { VES: 0, USD: 1 } as const;

// Lo que Inicio pone a revisar (M7): los sobres en descubierto, por moneda y del más
// hondo al menos, y lo que deben que ya venció o vence en `DUE_SOON_DAYS` días, por
// fecha. Lo que les deben no: eso no se paga. Los ingresos por cobrar se suman en M9.
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
