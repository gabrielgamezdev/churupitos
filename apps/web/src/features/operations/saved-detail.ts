import { formatMoney, type Currency } from "@/lib/money";

import type { CellChange, EntryInput } from "./operation-draft";

type EnvelopeName = { name: string; emoji: string | null };

// La segunda línea del aviso al guardar (M7): cómo queda el sobre en esa cuenta, con la
// comisión si salió de él, o entre cuántos se repartió. Sin los saldos de la cuenta
// (no cargaron), nada: mejor callar que dar una cifra a medias.
export function savedDetail(
  entries: EntryInput[],
  changes: CellChange[],
  envelopeOf: (envelopeId: string) => EnvelopeName | undefined,
  currency: Currency,
): string | undefined {
  const envelopeIds = [
    ...new Set(entries.filter((entry) => !entry.is_fee).map((entry) => entry.envelope_id)),
  ];
  if (envelopeIds.length > 1) return `Repartido entre ${envelopeIds.length} sobres`;
  const [envelopeId] = envelopeIds;
  const change = changes.find((row) => row.envelopeId === envelopeId);
  const envelope = envelopeId ? envelopeOf(envelopeId) : undefined;
  if (!change || !envelope) return undefined;
  const name = envelope.emoji ? `${envelope.emoji} ${envelope.name}` : envelope.name;
  return `${name} queda en ${formatMoney(change.afterCents, currency)}`;
}
