import type { Envelope, EnvelopeUsage } from "@/features/envelopes/queries";

// Cuántos sobres se ven sin tocar «Más sobres»: dos columnas de tres, sin bajar.
export const TOP_ENVELOPES = 6;

// Los sobres en el orden del presupuesto, y «Otro» al final (R11).
export function budgetOrder(envelopes: Envelope[]): Envelope[] {
  return [...envelopes].sort(
    (a, b) => Number(a.isThirdParty) - Number(b.isThirdParty) || a.position - b.position,
  );
}

// Los sobres de Registrar para una cuenta (M7): arriba, los más usados en ella (a igual
// uso, en el orden del presupuesto), completados con los primeros del presupuesto si
// hay pocos; debajo, los demás, en el orden del presupuesto. Sin cuenta, el presupuesto.
export function envelopeOrder(
  envelopes: Envelope[],
  usage: EnvelopeUsage[],
  accountId: string,
): { top: Envelope[]; rest: Envelope[] } {
  const budget = budgetOrder(envelopes);
  const uses = new Map(
    usage.filter((row) => row.accountId === accountId).map((row) => [row.envelopeId, row.uses]),
  );
  const used = budget
    .filter((envelope) => (uses.get(envelope.id) ?? 0) > 0)
    .sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0));
  const top = used.slice(0, TOP_ENVELOPES);
  for (const envelope of budget) {
    if (top.length >= TOP_ENVELOPES) break;
    if (!envelope.isThirdParty && !top.includes(envelope)) top.push(envelope);
  }
  return { top, rest: budget.filter((envelope) => !top.includes(envelope)) };
}
