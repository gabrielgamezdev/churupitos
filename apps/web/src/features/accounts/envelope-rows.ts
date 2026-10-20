import type { Envelope } from "@/features/envelopes/queries";

import type { Cell } from "./queries";

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
