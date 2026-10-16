// Datos inventados para la galería (regla 1): «Banco A», sobres genéricos y cifras
// redondas. Cuadran entre sí: el libro termina en el saldo de la cuenta y los sobres
// suman lo mismo.

import type { EnvelopeRow } from "./ledger-view";
import type { Envelope, LedgerEntry, OperationDetail } from "./queries";

const envelope = (id: string, name: string, emoji: string | null, position: number) => ({
  id,
  name,
  emoji,
  isThirdParty: emoji === null,
  position,
});

export const SAMPLE_ENVELOPES: Envelope[] = [
  envelope("ahorro", "Ahorro", "🏦", 1),
  envelope("comida", "Comida", "🍱", 2),
  envelope("transporte", "Transporte", "🚌", 3),
  envelope("otro", "Otro", null, 4),
];

export const SAMPLE_ENVELOPE_BY_ID = Object.fromEntries(SAMPLE_ENVELOPES.map((e) => [e.id, e]));

export const SAMPLE_ACCOUNT_BY_ID = {
  "banco-a": { name: "Banco A", currency: "VES" as const },
  "billetera-b": { name: "Billetera B", currency: "USD" as const },
};

export const SAMPLE_ENVELOPE_ROWS: EnvelopeRow[] = [
  { envelope: SAMPLE_ENVELOPES[0]!, balanceCents: 400000 },
  { envelope: SAMPLE_ENVELOPES[1]!, balanceCents: 125000 },
  { envelope: SAMPLE_ENVELOPES[2]!, balanceCents: -5000 },
  { envelope: SAMPLE_ENVELOPES[3]!, balanceCents: 100000 },
];

export const SAMPLE_TODAY = "2026-10-15";

const entry = (
  entryId: string,
  day: string,
  description: string,
  envelopeId: string,
  amountCents: number,
  runningBalanceCents: number,
  extra: Partial<LedgerEntry> = {},
): LedgerEntry => ({
  entryId,
  operationId: entryId,
  day,
  dateApproximate: false,
  kind: "expense",
  envelopeId,
  amountCents,
  isFee: false,
  description,
  runningBalanceCents,
  ...extra,
});

export const SAMPLE_LEDGER: LedgerEntry[] = [
  entry("mercado", "2026-10-15", "Mercado de la semana", "comida", -72000, 620000),
  entry("comision", "2026-10-15", "Comisión pago móvil", "comida", -3000, 692000, {
    isFee: true,
  }),
  entry("cambio", "2026-10-13", "$100 de Ahorro", "ahorro", 400000, 695000, {
    kind: "exchange",
  }),
  entry("pasaje", "2026-10-13", "Pasaje", "transporte", -5000, 295000, {
    dateApproximate: true,
  }),
];

const single = (id: string, envelopeId: string, amountCents: number, isFee = false) => ({
  kind: "expense",
  adjustmentReason: null,
  entries: [{ id, accountId: "banco-a", envelopeId, amountCents, isFee, description: "" }],
});

export const SAMPLE_OPERATIONS: Record<string, OperationDetail> = {
  mercado: single("mercado", "comida", -72000),
  comision: single("comision", "comida", -3000, true),
  pasaje: single("pasaje", "transporte", -5000),
  cambio: {
    kind: "exchange",
    adjustmentReason: null,
    entries: [
      {
        id: "cambio-sale",
        accountId: "billetera-b",
        envelopeId: "ahorro",
        amountCents: -10000,
        isFee: false,
        description: "",
      },
      {
        id: "cambio-entra",
        accountId: "banco-a",
        envelopeId: "ahorro",
        amountCents: 400000,
        isFee: false,
        description: "",
      },
    ],
  },
};
