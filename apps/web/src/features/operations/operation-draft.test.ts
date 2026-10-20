import { describe, expect, it } from "vitest";

import { draftEntries, projectCells, type OperationDraft } from "./operation-draft";

const expense: OperationDraft = {
  kind: "expense",
  accountId: "Banco A",
  lines: [{ envelopeId: "Comida", amountCents: 15000 }],
  fee: { envelopeId: "Comida", amountCents: 100, description: "Comisión" },
};

describe("los asientos de lo que se registra", () => {
  it("un gasto sale, y su comisión es un asiento aparte que también sale (R16)", () => {
    expect(draftEntries(expense)).toEqual([
      {
        account_id: "Banco A",
        envelope_id: "Comida",
        amount_cents: -15000,
        is_fee: false,
        description: "",
      },
      {
        account_id: "Banco A",
        envelope_id: "Comida",
        amount_cents: -100,
        is_fee: true,
        description: "Comisión",
      },
    ]);
  });

  it("un ingreso entra, pero su comisión sale", () => {
    const entries = draftEntries({ ...expense, kind: "income" });
    expect(entries.map((entry) => entry.amount_cents)).toEqual([15000, -100]);
  });
});

describe("cómo queda cada sobre", () => {
  const cells = [
    { envelopeId: "Comida", balanceCents: 10000 },
    { envelopeId: "Ahorro", balanceCents: 50000 },
  ];

  it("suma lo que se registra a lo de hoy, y puede quedar en descubierto (R6)", () => {
    expect(projectCells(draftEntries(expense), cells)).toEqual([
      { envelopeId: "Comida", beforeCents: 10000, afterCents: -5100 },
    ]);
  });

  it("un sobre que la cuenta todavía no tiene empieza en cero", () => {
    const entries = draftEntries({
      ...expense,
      lines: [{ envelopeId: "Viajes", amountCents: 500 }],
      fee: null,
    });
    expect(projectCells(entries, cells)).toEqual([
      { envelopeId: "Viajes", beforeCents: 0, afterCents: -500 },
    ]);
  });

  it("al corregir, parte de lo que había sin la operación", () => {
    // Hoy Comida tiene Bs 100 después de un gasto de Bs 150 que ahora pasa a ser de Bs 120.
    const previous = draftEntries({ ...expense, fee: null });
    const corrected = draftEntries({
      ...expense,
      lines: [{ envelopeId: "Comida", amountCents: 12000 }],
      fee: null,
    });
    expect(projectCells(corrected, cells, previous)).toEqual([
      { envelopeId: "Comida", beforeCents: 25000, afterCents: 13000 },
    ]);
  });
});
