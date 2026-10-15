// El arrastre (R7). Las filas «Lo que tenía antes» no se importan como movimientos:
// dicen cuánto había en cada celda al empezar el mes, y eso la app ya lo sabe
// sumando lo anterior. Se comparan con esa suma, y solo lo que no coincide se
// registra, como un ajuste con fecha (D5):
//
// - una cuenta que nunca se había movido abre con sus saldos: `opening`, el día 1;
// - unos céntimos de diferencia son redondeo del Excel: `correction`, el último día
//   del mes anterior, para que su cierre dé lo mismo que el Excel;
// - lo demás es dinero que cambió de sobre al copiar el arrastre:
//   `carry_reassignment`, el día 1. Si además no suma cero, aparece o desaparece
//   dinero, y queda anotado para revisarlo.
//
// Una cuenta que declara alguna fila de arrastre declara su retrato completo: la
// celda que no aparece vale cero. Una que no declara ninguna no dice nada.

import type { DraftOperation } from "./draft.ts";
import type { Issues } from "./issues.ts";
import type { LedgerRow } from "./ledger-sheet.ts";

const ROUNDING_CENTS = 5;

const DESCRIPTIONS = {
  opening: "Saldo inicial",
  correction: "Céntimos de redondeo del Excel",
  carry_reassignment: "Cambio de sobre al pasar al mes siguiente",
} as const;

export class CellBalances {
  private readonly cells = new Map<string, Map<string, number>>();
  private readonly moved = new Set<string>();

  apply(operation: DraftOperation) {
    for (const entry of operation.entries) {
      const cells = this.cells.get(entry.account) ?? new Map<string, number>();
      cells.set(entry.envelope, (cells.get(entry.envelope) ?? 0) + entry.amountCents);
      this.cells.set(entry.account, cells);
      this.moved.add(entry.account);
    }
  }

  of(account: string): Map<string, number> {
    return this.cells.get(account) ?? new Map();
  }

  hasMoved(account: string): boolean {
    return this.moved.has(account);
  }
}

// Los ajustes que hacen que el mes empiece donde dice el Excel. `balances` es el
// cierre del mes anterior, y se actualiza con ellos.
export function carryAdjustments(
  month: string,
  ledger: LedgerRow[],
  balances: CellBalances,
  issues: Issues,
): DraftOperation[] {
  const declaredByAccount = new Map<string, Map<string, number>>();
  for (const row of ledger.filter((candidate) => candidate.isCarry && candidate.envelope)) {
    const declared = declaredByAccount.get(row.account) ?? new Map<string, number>();
    declared.set(row.envelope!, (declared.get(row.envelope!) ?? 0) + row.amountCents);
    declaredByAccount.set(row.account, declared);
  }

  const adjustments: DraftOperation[] = [];
  for (const [account, declared] of declaredByAccount) {
    const derived = balances.of(account);
    const envelopes = new Set([...derived.keys(), ...declared.keys()]);
    const deltas = [...envelopes]
      .map((envelope) => ({
        envelope,
        cents: (declared.get(envelope) ?? 0) - (derived.get(envelope) ?? 0),
      }))
      .filter((delta) => delta.cents !== 0);
    if (deltas.length === 0) continue;

    const reason = !balances.hasMoved(account)
      ? "opening"
      : deltas.every((delta) => Math.abs(delta.cents) <= ROUNDING_CENTS)
        ? "correction"
        : "carry_reassignment";
    const total = deltas.reduce((sum, delta) => sum + delta.cents, 0);
    if (reason === "carry_reassignment" && total !== 0) {
      issues.warning(
        "CARRY_UNEXPLAINED",
        `El arrastre de «${account}» no cuadra con el cierre anterior por ${total} céntimos`,
      );
    }

    const operation: DraftOperation = {
      month,
      kind: "adjustment",
      date: reason === "correction" ? lastDayBefore(month) : `${month}-01`,
      dateApproximate: false,
      description: DESCRIPTIONS[reason],
      adjustmentReason: reason,
      incomeKey: null,
      entries: deltas.map(({ envelope, cents }) => ({
        account,
        envelope,
        amountCents: cents,
        isFee: false,
        description: DESCRIPTIONS[reason],
        position: 0,
        usdValueCents: null,
      })),
      refs: [],
    };
    balances.apply(operation);
    adjustments.push(operation);
  }
  return adjustments;
}

// El último día del mes anterior a `AAAA-MM`.
function lastDayBefore(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(year, monthNumber - 1, 0)).toISOString().slice(0, 10);
}
