// Del formulario de Registrar a los asientos que guarda la base, y lo que queda en cada
// sobre después. Los importes del formulario van sin signo; el signo lo pone el tipo.

export type OperationKind = "expense" | "income";

export type OperationDraft = {
  kind: OperationKind;
  accountId: string;
  // Cada sobre con su parte, sin signo.
  lines: { envelopeId: string; amountCents: number }[];
  // La comisión (R16), si la hubo: siempre sale, también en un ingreso.
  fee: { envelopeId: string; amountCents: number; description: string } | null;
};

// Un asiento como lo recibe `save_operation`.
export type EntryInput = {
  account_id: string;
  envelope_id: string;
  amount_cents: number;
  is_fee: boolean;
  description: string;
};

export function draftEntries(draft: OperationDraft): EntryInput[] {
  const sign = draft.kind === "expense" ? -1 : 1;
  const entries = draft.lines.map((line) => ({
    account_id: draft.accountId,
    envelope_id: line.envelopeId,
    amount_cents: sign * line.amountCents,
    is_fee: false,
    description: "",
  }));
  if (draft.fee) {
    entries.push({
      account_id: draft.accountId,
      envelope_id: draft.fee.envelopeId,
      amount_cents: -draft.fee.amountCents,
      is_fee: true,
      description: draft.fee.description,
    });
  }
  return entries;
}

export type CellChange = { envelopeId: string; beforeCents: number; afterCents: number };

// Cómo queda cada sobre de la cuenta que toca la operación, en el orden en que
// aparecen. `cells` son los saldos de hoy de esa cuenta; al corregir, `previous` son los
// asientos que la operación ya tenía, que se quitan antes de poner los nuevos.
export function projectCells(
  entries: EntryInput[],
  cells: { envelopeId: string; balanceCents: number }[],
  previous: EntryInput[] = [],
): CellChange[] {
  const today = new Map(cells.map((cell) => [cell.envelopeId, cell.balanceCents]));
  const before = new Map<string, number>();
  for (const entry of previous) {
    const base = before.get(entry.envelope_id) ?? today.get(entry.envelope_id) ?? 0;
    before.set(entry.envelope_id, base - entry.amount_cents);
  }
  const changes = new Map<string, CellChange>();
  for (const entry of entries) {
    const change = changes.get(entry.envelope_id) ?? {
      envelopeId: entry.envelope_id,
      beforeCents: before.get(entry.envelope_id) ?? today.get(entry.envelope_id) ?? 0,
      afterCents: before.get(entry.envelope_id) ?? today.get(entry.envelope_id) ?? 0,
    };
    change.afterCents += entry.amount_cents;
    changes.set(entry.envelope_id, change);
  }
  return [...changes.values()];
}
