import type { Currency } from "@/lib/money";
import { monthLabel, monthOf } from "@/lib/months";

import type { Debt, DebtDirection } from "./queries";

export type DebtGroup = {
  // El mes de vencimiento, o `null` para las que no tienen fecha.
  month: string | null;
  label: string;
  // Lo que suma el grupo en cada moneda, sin mezclarlas (R1).
  totals: Partial<Record<Currency, number>>;
  debts: Debt[];
};

// Lo que deben o lo que les deben, como se enseña: lo pendiente, también agrupado por mes
// de vencimiento (del más cercano al más lejano, y las que no tienen fecha al final); y
// aparte, las pagadas en `month`, el mes en curso. Las de meses anteriores ya no se
// enseñan. Llegan ya ordenadas por fecha.
export function summarizeDebts(
  debts: Debt[],
  direction: DebtDirection,
  month: string,
): { pending: Debt[]; groups: DebtGroup[]; paid: Debt[] } {
  const own = debts.filter((debt) => debt.direction === direction);
  const pending = own.filter((debt) => debt.paidOn === null);
  const groups = new Map<string | null, DebtGroup>();
  for (const debt of pending) {
    const dueMonth = debt.dueOn ? monthOf(debt.dueOn) : null;
    let group = groups.get(dueMonth);
    if (!group) {
      const label = dueMonth ? monthLabel(dueMonth) : "Sin fecha";
      group = { month: dueMonth, label, totals: {}, debts: [] };
      groups.set(dueMonth, group);
    }
    group.debts.push(debt);
    group.totals[debt.currency] = (group.totals[debt.currency] ?? 0) + debt.amountCents;
  }
  const sorted = [...groups.values()].sort((a, b) =>
    a.month === null ? 1 : b.month === null ? -1 : a.month.localeCompare(b.month),
  );
  const paid = own.filter((debt) => debt.paidOn !== null && monthOf(debt.paidOn) === month);
  return { pending, groups: sorted, paid };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Días de `from` a `to`, contados en el calendario: sin horas ni zonas horarias (R13).
export function daysBetween(from: string, to: string): number {
  const utc = (day: string) => {
    const [year, month, date] = day.split("-").map(Number) as [number, number, number];
    return Date.UTC(year, month - 1, date);
  };
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

// Cuándo vence una cuota, dicho desde hoy. Una vencida lo dice sin regañar.
export function dueLabel(dueOn: string, today: string): { text: string; overdue: boolean } {
  const days = daysBetween(today, dueOn);
  if (days === 0) return { text: "vence hoy", overdue: false };
  if (days === 1) return { text: "vence mañana", overdue: false };
  if (days > 1) return { text: `en ${days} días`, overdue: false };
  if (days === -1) return { text: "venció ayer", overdue: true };
  return { text: `venció hace ${-days} días`, overdue: true };
}
