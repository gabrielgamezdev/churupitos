// Los cobros: cada ingreso esperado del presupuesto con la operación de ingreso que
// lo cobró. El Excel no los enlaza; se reconocen porque la operación suma lo mismo
// que el ingreso dice que llegó, en fechas cercanas. Solo se enlaza cuando hay un
// único candidato: un cobro sin enlazar queda como ingreso suelto y su línea, ⏳.

import type { ExpectedIncomeRow } from "./budget-sheet.ts";
import { daysBetween } from "./draft.ts";
import type { DraftOperation } from "./draft.ts";
import type { Issues } from "./issues.ts";
import type { Currency } from "./money.ts";
import { parseAmountText } from "./money.ts";

export type ExpectedIncomeDraft = {
  key: string;
  month: string;
  name: string;
  usdCents: number;
  position: number;
};

type Income = { row: ExpectedIncomeRow; draft: ExpectedIncomeDraft };

// El Excel fecha a veces el ingreso unos días después del reparto: primero se
// enlaza lo cercano y luego, con lo que queda, lo que está algo más lejos.
const WINDOWS_DAYS = [2, 4];
const MATCH_TOLERANCE_CENTS = 1;

// `operations` son las del mes, y se pueden partir (ver `splitShared`); `earlier`,
// las del mes anterior que no cobraron nada, porque un ingreso puede llegar el día
// 30 del mes que no le toca.
export function linkReceipts(
  month: string,
  rows: ExpectedIncomeRow[],
  operations: DraftOperation[],
  earlier: DraftOperation[],
  currencyOf: (account: string) => Currency,
  issues: Issues,
): ExpectedIncomeDraft[] {
  // Una línea de $0 es un hueco para que los bloques no se muevan, no un ingreso.
  const incomes: Income[] = rows
    .filter((row) => row.source && row.usdCents !== null && row.usdCents > 0)
    .map((row, i) => ({
      row,
      draft: {
        key: `${month}#${i + 1}`,
        month,
        name: row.source!,
        usdCents: row.usdCents!,
        position: i + 1,
      },
    }));
  const linked = new Map<Income, DraftOperation>();
  const isIncome = (operation: DraftOperation) =>
    operation.kind === "income" && operation.incomeKey === null;
  const target = (income: Income, operation: DraftOperation) =>
    currencyOf(operation.entries[0]!.account) === "VES"
      ? income.row.localCents
      : income.row.usdCents;
  const near = (income: Income, operation: DraftOperation, days: number) =>
    income.row.date !== null && daysBetween(operation.date, income.row.date) <= days;
  const matches = (income: Income, operation: DraftOperation, days: number) => {
    const expected = target(income, operation);
    return (
      expected !== null &&
      near(income, operation, days) &&
      Math.abs(received(operation) - expected) <= MATCH_TOLERANCE_CENTS
    );
  };

  for (const days of WINDOWS_DAYS) {
    const candidates = [...operations, ...earlier].filter(isIncome);
    // Uno por uno los que tienen un solo candidato, y otra vuelta, porque enlazar
    // uno puede dejar a otro con un solo candidato.
    for (let changed = true; changed;) {
      changed = false;
      const taken = new Set(linked.values());
      for (const income of incomes.filter((candidate) => !linked.has(candidate))) {
        const options = candidates.filter(
          (operation) => !taken.has(operation) && matches(income, operation, days),
        );
        const rivals =
          options.length === 1
            ? incomes.filter((other) => !linked.has(other) && matches(other, options[0]!, days))
            : [];
        if (options.length !== 1 || rivals.length !== 1) continue;
        linked.set(income, options[0]!);
        taken.add(options[0]!);
        changed = true;
      }
    }
  }

  // Un cobro que paga dos ingresos a la vez: un solo «Abono = Bs…» para los dos.
  const taken = new Set(linked.values());
  for (const operation of operations.filter(
    (candidate) => isIncome(candidate) && !taken.has(candidate),
  )) {
    const pending = incomes.filter(
      (income) => !linked.has(income) && near(income, operation, WINDOWS_DAYS[0]!),
    );
    const parts = splitShared(operation, pending, target);
    if (!parts) continue;
    operations.splice(operations.indexOf(operation), 1, ...parts.map((part) => part.operation));
    parts.forEach((part) => linked.set(part.income, part.operation));
  }

  for (const income of incomes) {
    const operation = linked.get(income);
    if (operation && assignUsdValues(operation, income.draft.usdCents, currencyOf, issues)) {
      operation.incomeKey = income.draft.key;
    } else if (income.row.checked) {
      issues.warning(
        "RECEIPT_NOT_FOUND",
        `El ingreso «${income.row.sourceText}» está ✅ pero no se encontró su cobro`,
        `PRESUPUESTO!${income.row.row}`,
      );
    }
  }
  return incomes.map((income) => income.draft);
}

const received = (operation: DraftOperation) =>
  operation.entries
    .filter((entry) => !entry.isFee)
    .reduce((sum, entry) => sum + entry.amountCents, 0);

// Si las líneas de un cobro, en su orden, se pueden cortar en tramos que sumen
// exactamente lo de varios ingresos pendientes, se parte en una operación por
// ingreso. Las comisiones van con el tramo de la línea que tienen delante.
function splitShared(
  operation: DraftOperation,
  pending: Income[],
  target: (income: Income, operation: DraftOperation) => number | null,
): { income: Income; operation: DraftOperation }[] | null {
  const lines = operation.entries
    .filter((entry) => !entry.isFee)
    .sort((a, b) => a.position - b.position);
  const segments: { income: Income; start: number }[] = [];
  const left = new Set(pending);
  let total = 0;
  let start = lines[0]?.position ?? 0;
  for (const line of lines) {
    total += line.amountCents;
    const hit = [...left].find((income) => target(income, operation) === total);
    if (!hit) continue;
    segments.push({ income: hit, start });
    left.delete(hit);
    total = 0;
    start = lines[lines.indexOf(line) + 1]?.position ?? Infinity;
  }
  if (total !== 0 || segments.length < 2) return null;

  return segments.map(({ income, start: from }, i) => {
    const until = segments[i + 1]?.start ?? Infinity;
    const inside = (position: number) => (i === 0 || position >= from) && position < until;
    const entries = operation.entries.filter((entry) => inside(entry.position));
    const positions = new Set(entries.map((entry) => entry.position));
    // El título no es de ninguna línea: se queda con el primer tramo.
    const refs = operation.refs.filter((ref) => {
      const row = Number(ref.split(":").at(-1));
      return (
        positions.has(row) ||
        (i === 0 && !operation.entries.some((entry) => entry.position === row))
      );
    });
    return { income, operation: { ...operation, entries, refs } };
  });
}

// R9: el valor en dólares de cada línea del reparto. Si todas lo dicen en su
// concepto («$60 de Ahorro») y suman el cobro, se usa eso; si no, se reparte el
// cobro en proporción a los bolívares y la última línea absorbe el céntimo.
function assignUsdValues(
  operation: DraftOperation,
  usdCents: number,
  currencyOf: (account: string) => Currency,
  issues: Issues,
): boolean {
  const lines = operation.entries.filter((entry) => !entry.isFee);
  if (currencyOf(lines[0]!.account) === "USD") return true;

  const written = lines.map((line) => {
    const match = /^\$\s*(\d[\d.,]*)/.exec(line.description);
    return match ? (parseAmountText(match[1]!)?.cents ?? null) : null;
  });
  const writtenTotal = written.reduce<number>((sum, cents) => sum + (cents ?? 0), 0);
  let values: number[];
  if (written.every((cents) => cents !== null && cents > 0) && writtenTotal === usdCents) {
    values = written as number[];
  } else {
    const local = lines.reduce((sum, line) => sum + line.amountCents, 0);
    values = lines.map((line) => Math.round((usdCents * line.amountCents) / local));
    values[values.length - 1] =
      usdCents - values.slice(0, -1).reduce((sum, cents) => sum + cents, 0);
    issues.warning(
      "ALLOCATION_DERIVED",
      `El reparto de «${operation.description}» se calculó por proporción`,
    );
  }
  // Una línea diminuta puede quedarse sin un céntimo: entonces no se enlaza.
  if (values.some((cents) => cents <= 0)) {
    issues.warning(
      "ALLOCATION_TOO_SMALL",
      `El reparto de «${operation.description}» no se puede pasar a dólares`,
    );
    return false;
  }
  lines.forEach((line, i) => (line.usdValueCents = values[i]!));
  return true;
}
