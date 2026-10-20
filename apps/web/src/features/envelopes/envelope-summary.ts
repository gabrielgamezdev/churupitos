import type { Currency } from "@/lib/money";

import type { Envelope, EnvelopeBalance } from "./queries";

export type EnvelopeSummary = {
  envelope: Envelope;
  // Solo las monedas en las que tiene algo (o debe): nunca se suman entre sí (R1).
  balances: Partial<Record<Currency, number>>;
};

// La lista de sobres, como se enseña: los que tienen dinero (o deben), en el orden del
// presupuesto y «Otro» al final, que no es del hogar (R11); y aparte, los que están en
// cero: ya gastados este mes, o de meses pasados que no se usan.
export function summarizeEnvelopes(
  envelopes: Envelope[],
  balances: EnvelopeBalance[],
): { withMoney: EnvelopeSummary[]; empty: Envelope[] } {
  const byEnvelope = new Map<string, Partial<Record<Currency, number>>>();
  for (const balance of balances) {
    if (balance.balanceCents === 0) continue;
    const entry = byEnvelope.get(balance.envelopeId) ?? {};
    entry[balance.currency] = balance.balanceCents;
    byEnvelope.set(balance.envelopeId, entry);
  }

  const ordered = [...envelopes].sort(
    (a, b) => Number(a.isThirdParty) - Number(b.isThirdParty) || a.position - b.position,
  );
  const withMoney: EnvelopeSummary[] = [];
  const empty: Envelope[] = [];
  for (const envelope of ordered) {
    const amounts = byEnvelope.get(envelope.id);
    if (amounts) withMoney.push({ envelope, balances: amounts });
    else empty.push(envelope);
  }
  return { withMoney, empty };
}
