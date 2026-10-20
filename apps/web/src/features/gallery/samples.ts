// Datos inventados para la galería (regla 1): «Banco A», sobres genéricos y cifras
// redondas. Cuadran entre sí: el libro termina en el saldo de la cuenta y los sobres
// suman lo mismo.

import type { EnvelopeRow } from "@/features/accounts/envelope-rows";
import type { PlanRow } from "@/features/budget/budget-view";
import type { BudgetChecks, ExpectedIncome } from "@/features/budget/queries";
import type { Debt, DebtTotal } from "@/features/debts/queries";
import type { Envelope } from "@/features/envelopes/queries";
import type { LedgerEntry, OperationDetail } from "@/features/ledger/queries";

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
  accountId: "banco-a",
  envelopeId,
  currency: "VES",
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

// Lo de una operación que no son sus asientos. Lo importado del Excel no tiene autor.
const imported = (day: string, description = "") => ({
  adjustmentReason: null,
  day,
  description,
  incomeId: null,
  fromApp: false,
  authorName: null,
});

const single = (id: string, envelopeId: string, amountCents: number, isFee = false) => ({
  kind: "expense",
  ...imported("2026-10-12"),
  entries: [
    {
      id,
      accountId: "banco-a",
      envelopeId,
      amountCents,
      isFee,
      description: "",
      usdValueCents: null,
    },
  ],
});

export const SAMPLE_OPERATIONS: Record<string, OperationDetail> = {
  // Registrado en la app: dice quién, y se puede corregir o borrar.
  mercado: {
    ...single("mercado", "comida", -72000),
    description: "Mercado",
    fromApp: true,
    authorName: "Ana",
  },
  comision: single("comision", "comida", -3000, true),
  pasaje: single("pasaje", "transporte", -5000),
  cambio: {
    kind: "exchange",
    ...imported("2026-10-11"),
    entries: [
      {
        id: "cambio-sale",
        accountId: "billetera-b",
        envelopeId: "ahorro",
        amountCents: -10000,
        isFee: false,
        description: "",
        usdValueCents: null,
      },
      {
        id: "cambio-entra",
        accountId: "banco-a",
        envelopeId: "ahorro",
        amountCents: 400000,
        isFee: false,
        description: "",
        usdValueCents: null,
      },
    ],
  },
  // Un cobro de $100 a Bs 400 en el Banco A, repartido en dólares entre dos sobres (R9).
  cobro: {
    kind: "income",
    ...imported("2026-10-09", "Bono"),
    incomeId: "bono",
    entries: [
      {
        id: "cobro-ahorro",
        accountId: "banco-a",
        envelopeId: "ahorro",
        amountCents: 2400000,
        isFee: false,
        description: "",
        usdValueCents: 6000,
      },
      {
        id: "cobro-comida",
        accountId: "banco-a",
        envelopeId: "comida",
        amountCents: 1600000,
        isFee: false,
        description: "",
        usdValueCents: 4000,
      },
    ],
  },
  // En una cuenta en dólares, el importe ya es su valor en dólares.
  "cobro-quincena": {
    kind: "income",
    ...imported("2026-09-30", "Quincena"),
    incomeId: "quincena",
    entries: [
      {
        id: "quincena-transporte",
        accountId: "billetera-b",
        envelopeId: "transporte",
        amountCents: 5000,
        isFee: false,
        description: "",
        usdValueCents: null,
      },
    ],
  },
};

// Los ingresos de un mes: uno cobrado en bolívares (el de arriba), otro en dólares y
// uno que todavía no llega.
export const SAMPLE_INCOMES: ExpectedIncome[] = [
  {
    id: "bono",
    name: "Bono",
    emoji: "💰",
    expectedUsdCents: 10000,
    receipt: {
      operationId: "cobro",
      day: "2026-10-09",
      accountId: "banco-a",
      currency: "VES",
      amountCents: 4000000,
      usdCents: 10000,
    },
  },
  {
    id: "quincena",
    name: "Quincena",
    emoji: "💵",
    expectedUsdCents: 5000,
    receipt: {
      operationId: "cobro-quincena",
      day: "2026-09-30",
      accountId: "billetera-b",
      currency: "USD",
      amountCents: 5000,
      usdCents: 5000,
    },
  },
  { id: "extra", name: "Extra", emoji: null, expectedUsdCents: 2000, receipt: null },
];

const planLine = (
  envelopeIndex: number,
  plannedUsdCents: number,
  allocatedUsdCents: number,
  notes: [string, string],
) => {
  const envelope = SAMPLE_ENVELOPES[envelopeIndex]!;
  return {
    envelope,
    line: {
      id: envelope.id,
      envelopeId: envelope.id,
      plannedUsdCents,
      allocatedUsdCents,
      allocatedVesCents: allocatedUsdCents * 400,
      isDelivered: allocatedUsdCents >= plannedUsdCents,
      fundingNote: notes[0],
      actionNote: notes[1],
    },
  };
};

// El plan del cobro de arriba: Ahorro recibió todo, Comida una parte y Transporte nada.
export const SAMPLE_PLAN: PlanRow[] = [
  planLine(0, 6000, 6000, ["💰 Bono", "Cambiar a USDT"]),
  planLine(1, 6000, 4000, ["💰 Bono, 💵 Quincena", "Mantener en bolívares"]),
  planLine(2, 2000, 0, ["Extra", ""]),
];

// Un mes que cuadra y otro con $20 esperados sin plan y Bs 100 cobrados sin repartir.
export const SAMPLE_CHECKS: BudgetChecks[] = [
  {
    month: "2026-10",
    expectedUsdCents: 17000,
    plannedUsdCents: 17000,
    receivedVesCents: 4000000,
    allocatedVesCents: 4000000,
  },
  {
    month: "2026-09",
    expectedUsdCents: 17000,
    plannedUsdCents: 15000,
    receivedVesCents: 4010000,
    allocatedVesCents: 4000000,
  },
];

// Deudas inventadas, vistas desde SAMPLE_TODAY: una vencida, dos que vienen, una sin
// fecha, una pagada este mes y un deudor.
const sampleDebt = (
  id: string,
  description: string,
  amountCents: number,
  dueOn: string | null,
  extra: Partial<Debt> = {},
): Debt => ({
  id,
  direction: "payable",
  description,
  amountCents,
  currency: "USD",
  dueOn,
  isPaid: false,
  position: 0,
  ...extra,
});

export const SAMPLE_DEBTS: Debt[] = [
  sampleDebt("tienda-oct", "Cuota de la tienda", 2000, "2026-10-04", { isPaid: true }),
  sampleDebt("telefono", "Cuota del teléfono", 1500, "2026-10-12"),
  sampleDebt("tienda-nov", "Cuota de la tienda", 2000, "2026-11-04"),
  sampleDebt("tarjeta", "Tarjeta", 500000, "2026-11-20", { currency: "VES" }),
  sampleDebt("prestamo", "Comida le debe a Ahorro", 3000, null),
  sampleDebt("amigo", "Un amigo", 1000, null, { direction: "receivable" }),
];

export const SAMPLE_DEBT_TOTALS: DebtTotal[] = [
  { direction: "payable", currency: "VES", totalCents: 500000 },
  { direction: "payable", currency: "USD", totalCents: 6500 },
  { direction: "receivable", currency: "USD", totalCents: 1000 },
];
