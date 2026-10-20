// D9: de Deudas y Deudores se importa la lista vigente y las pagadas del mes en curso.
//
// Cada Excel guarda la lista de su mes. Desde octubre de 2026, cada deuda lleva ✅ si
// ya se pagó y ⏳ si no; antes, las pagadas se borraban. Y el libro del mes siguiente
// puede existir antes de tiempo, como planificación: sus deudas son las que vencen en
// él. Así que vigente es:
// - lo que no está pagado en el último libro, y
// - las cuotas con fecha del libro anterior que siguen en ⏳: vencen a fin de mes y no
//   pasaron al siguiente.
// Una deuda sin fecha que sigue en ⏳ en el libro anterior pero no pasó al último se
// dejó de pagar a propósito: queda en el Excel como recuerdo, y no se importa.
//
// Las pagadas (✅) son las del libro del mes en curso: el último que no es solo
// planificación. Las de meses anteriores no se guardan. El Excel no dice qué día se
// pagó cada una: se toma su fecha límite, o el último día del mes si vence después o no
// tiene, para que se vea entre las pagadas de ese mes.

import type { DebtRow } from "./budget-sheet.ts";
import { Issues } from "./issues.ts";
import type { Issue } from "./issues.ts";
import type { Currency } from "./money.ts";
import { normalizeText } from "./text.ts";

export type DebtDraft = {
  direction: "payable" | "receivable";
  description: string;
  amountCents: number;
  currency: Currency;
  dueOn: string | null;
  // El día en que se pagó; `null` si no está pagada.
  paidOn: string | null;
  position: number;
};

// `planning`: el libro de un mes que aún no empieza (DOMINIO §2).
export type MonthDebts = { month: string; debts: DebtRow[]; planning?: boolean };

// Por encima de esto, un deudor sin moneda está en bolívares: nadie le presta mil
// dólares a un vecino, y mil bolívares son poca cosa.
const VES_GUESS_FROM_CENTS = 100_000;

const sameDebt = (a: DebtRow, b: DebtRow) =>
  a.direction === b.direction &&
  normalizeText(a.description) === normalizeText(b.description) &&
  a.amountCents === b.amountCents &&
  a.dueOn === b.dueOn;

// `months`, en orden: cuentan el último y el anterior.
export function currentDebts(months: MonthDebts[]): { debts: DebtDraft[]; issues: Issue[] } {
  const last = months.at(-1);
  const previous = months.at(-2);
  const picked: { debt: DebtRow; month: string }[] = [];
  const issues: Issue[] = [];

  if (last && previous) {
    const dropped = new Issues();
    for (const debt of previous.debts) {
      // Pagada, o de antes del ✅/⏳: la lista del último libro ya la sustituye.
      if (debt.paid !== false) continue;
      if (last.debts.some((other) => sameDebt(debt, other))) continue;
      if (debt.dueOn === null) {
        dropped.warning(
          "DEBT_DROPPED",
          `«${debt.description}» sigue en ⏳ sin fecha pero no pasó a ${last.month}: no se importa`,
          `PRESUPUESTO!${debt.row}`,
        );
        continue;
      }
      picked.push({ debt, month: previous.month });
    }
    issues.push(...dropped.list.map((issue) => ({ ...issue, month: previous.month })));
  }
  if (last) {
    for (const debt of last.debts) if (debt.paid !== true) picked.push({ debt, month: last.month });
  }
  const current = months.findLast((month) => !month.planning);
  if (current) {
    for (const debt of current.debts) {
      if (debt.paid === true) picked.push({ debt, month: current.month });
    }
  }

  const debts: DebtDraft[] = [];
  for (const { debt, month } of picked) {
    if (debt.amountCents === null) continue;
    let currency = debt.currency;
    if (!currency) {
      currency = debt.amountCents >= VES_GUESS_FROM_CENTS ? "VES" : "USD";
      issues.push({
        level: "warning",
        code: "DEBT_CURRENCY_GUESSED",
        message: `«${debt.description}» no dice su moneda: se toma ${currency}`,
        ref: `PRESUPUESTO!${debt.row}`,
        month,
      });
    }
    debts.push({
      direction: debt.direction,
      description: debt.description,
      amountCents: debt.amountCents,
      currency,
      dueOn: debt.dueOn,
      paidOn: debt.paid === true ? paidDay(debt.dueOn, month) : null,
      position: debts.length + 1,
    });
  }
  return { debts, issues };
}

// El día de pago de una ✅ del libro de `month` (`AAAA-MM`): su fecha límite, sin pasar
// del último día de ese mes.
function paidDay(dueOn: string | null, month: string): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const lastDay = `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, "0")}`;
  return dueOn !== null && dueOn < lastDay ? dueOn : lastDay;
}
