// Todos los meses leídos → todo lo que se va a escribir en la base: las operaciones
// del libro, los ingresos esperados con sus cobros, el plan de cada mes y la lista
// de deudas. Los meses van en orden, porque el arrastre de cada uno se compara con
// el cierre del anterior.

import type { Catalog } from "./catalog.ts";
import { CellBalances, carryAdjustments } from "./continuity.ts";
import { currentDebts } from "./debts.ts";
import type { DebtDraft } from "./debts.ts";
import type { DraftOperation } from "./draft.ts";
import { groupMonth } from "./group-month.ts";
import { Issues } from "./issues.ts";
import type { Issue } from "./issues.ts";
import type { Currency } from "./money.ts";
import type { MonthData } from "./read-workbook.ts";
import { linkReceipts } from "./receipts.ts";
import type { ExpectedIncomeDraft } from "./receipts.ts";

export type BudgetLineDraft = {
  month: string;
  envelope: string;
  plannedUsdCents: number;
  fundingNote: string;
  actionNote: string;
};

export type ImportPackage = {
  months: string[];
  currencies: Record<string, Currency>;
  operations: DraftOperation[];
  expectedIncomes: ExpectedIncomeDraft[];
  budgetLines: BudgetLineDraft[];
  debts: DebtDraft[];
  issues: Issue[];
};

export function buildPackage(months: MonthData[], catalog: Catalog): ImportPackage {
  const currencies = new Map(catalog.accounts.map((account) => [account.name, account.currency]));
  const currencyOf = (account: string) => currencies.get(account)!;
  const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
  const balances = new CellBalances();
  let previous: DraftOperation[] = [];
  // Lo que llegó en cada mes según los presupuestos, también el de otro mes: la
  // quincena de un mes se cobra a veces el día 30 del anterior.
  const allIncomes = sorted.flatMap((data) => data.budget?.incomes ?? []);
  const result: ImportPackage = {
    months: sorted.map((data) => data.month),
    currencies: Object.fromEntries(currencies),
    operations: [],
    expectedIncomes: [],
    budgetLines: [],
    debts: [],
    issues: [],
  };

  sorted.forEach((data, i) => {
    const issues = new Issues();
    if (sorted[i - 1]?.month === data.month)
      issues.error("DUPLICATE_MONTH", `Hay dos libros de ${data.month}`);

    const incomes = data.budget?.incomes ?? [];
    const arrived = [...incomes, ...allIncomes.filter((row) => row.date?.startsWith(data.month))];
    const amounts = (pick: (row: (typeof incomes)[number]) => number | null) =>
      new Set(arrived.map(pick).filter((cents) => cents !== null));
    const adjustments = carryAdjustments(data.month, data.ledger, balances, issues);
    const grouped = groupMonth(data.month, data.ledger, currencyOf, issues, {
      VES: amounts((row) => row.localCents),
      USD: amounts((row) => row.usdCents),
    });
    grouped.forEach((operation) => balances.apply(operation));
    // Puede partir alguna operación de `grouped`: se escriben después.
    result.expectedIncomes.push(
      ...linkReceipts(data.month, incomes, grouped, previous, currencyOf, issues),
    );
    result.operations.push(...adjustments, ...grouped);
    previous = grouped;

    const planned = new Set<string>();
    for (const line of data.budget?.lines ?? []) {
      // «Otro» no tiene plan: su fila lleva un guion.
      if (!line.envelope || line.plannedUsdCents === null) continue;
      if (planned.has(line.envelope)) {
        issues.warning(
          "DUPLICATE_BUDGET_LINE",
          `«${line.envelopeText}» aparece dos veces en el plan`,
          `PRESUPUESTO!${line.row}`,
        );
        continue;
      }
      planned.add(line.envelope);
      result.budgetLines.push({
        month: data.month,
        envelope: line.envelope,
        plannedUsdCents: line.plannedUsdCents,
        fundingNote: line.fundingNote,
        actionNote: line.actionNote,
      });
    }

    result.issues.push(
      ...[...data.issues, ...issues.list].map((issue) => ({ ...issue, month: data.month })),
    );
  });

  // D9: de las deudas, solo la lista vigente (src/debts.ts).
  const current = currentDebts(
    sorted.map((data) => ({ month: data.month, debts: data.budget?.debts ?? [] })),
  );
  result.debts = current.debts;
  result.issues.push(...current.issues);
  return result;
}
