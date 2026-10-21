import type { Currency } from "@/lib/money";

import type { EntryInput } from "./operation-draft";

// Lo que se mueve sin gastarse (M8). Los importes van sin signo: lo que sale sale de
// `from` y lo que llega entra en `to`.
export type MoveKind = "envelope_transfer" | "account_transfer" | "exchange";

export type MoveSide = { accountId: string; envelopeId: string; currency: Currency };

export type MoveDraft = {
  from: MoveSide;
  to: MoveSide;
  amountCents: number;
  // Lo que llega, en un cambio de divisa; en lo demás, lo mismo que sale.
  arrivedCents: number;
  // La comisión (R16): sale de la cuenta de origen.
  fee: { envelopeId: string; amountCents: number; description: string } | null;
};

// El tipo, de las dos cuentas: la misma es entre sobres; otra de la misma moneda, un
// traspaso; otra moneda, un cambio. Así no hay que saber cómo se llama cada cosa.
export function moveKind(from: MoveSide, to: MoveSide): MoveKind {
  if (from.accountId === to.accountId) return "envelope_transfer";
  return from.currency === to.currency ? "account_transfer" : "exchange";
}

// Los asientos que guarda la base: una salida, una entrada y, si la hubo, la comisión.
export function moveEntries(draft: MoveDraft): EntryInput[] {
  const kind = moveKind(draft.from, draft.to);
  const entries: EntryInput[] = [
    {
      account_id: draft.from.accountId,
      envelope_id: draft.from.envelopeId,
      amount_cents: -draft.amountCents,
      is_fee: false,
      description: "",
    },
    {
      account_id: draft.to.accountId,
      envelope_id: draft.to.envelopeId,
      amount_cents: kind === "exchange" ? draft.arrivedCents : draft.amountCents,
      is_fee: false,
      description: "",
    },
  ];
  if (draft.fee) {
    entries.push({
      account_id: draft.from.accountId,
      envelope_id: draft.fee.envelopeId,
      amount_cents: -draft.fee.amountCents,
      is_fee: true,
      description: draft.fee.description,
    });
  }
  return entries;
}
