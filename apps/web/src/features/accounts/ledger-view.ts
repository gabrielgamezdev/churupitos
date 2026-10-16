import type { Cell, Envelope, LedgerEntry } from "./queries";

export type EnvelopeRow = { envelope: Envelope; balanceCents: number };

// Los sobres de una cuenta, como se enseñan: solo los que tienen dinero (o deben), en
// el orden del presupuesto y «Otro» al final, que no es del hogar (R11).
export function envelopeRows(cells: Cell[], envelopes: Envelope[]): EnvelopeRow[] {
  const byId = new Map(envelopes.map((envelope) => [envelope.id, envelope]));
  return cells
    .filter((cell) => cell.balanceCents !== 0)
    .flatMap((cell) => {
      const envelope = byId.get(cell.envelopeId);
      return envelope ? [{ envelope, balanceCents: cell.balanceCents }] : [];
    })
    .sort(
      (a, b) =>
        Number(a.envelope.isThirdParty) - Number(b.envelope.isThirdParty) ||
        a.envelope.position - b.envelope.position,
    );
}

export type LedgerDay = { day: string; entries: LedgerEntry[] };

// El libro por días, sin cambiar el orden en que llega (lo más nuevo arriba).
export function groupByDay(entries: LedgerEntry[]): LedgerDay[] {
  const days: LedgerDay[] = [];
  for (const entry of entries) {
    const last = days.at(-1);
    if (last?.day === entry.day) last.entries.push(entry);
    else days.push({ day: entry.day, entries: [entry] });
  }
  return days;
}
