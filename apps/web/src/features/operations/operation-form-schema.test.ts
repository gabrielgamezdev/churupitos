import { describe, expect, it } from "vitest";

import { draftEntries } from "./operation-draft";
import {
  emptyOperationForm,
  formDraft,
  operationFormSchema,
  operationFormValues,
} from "./operation-form-schema";

const filled = {
  ...emptyOperationForm("2026-10-20", "Banco A", "Comida"),
  description: "Mercado",
  lines: [{ envelopeId: "Comida", amount: "150" }],
};

describe("el formulario de Registrar", () => {
  it("abre en gasto, con hoy y con lo que ya viene elegido", () => {
    expect(emptyOperationForm("2026-10-20", "Banco A", "Comida")).toMatchObject({
      kind: "expense",
      day: "2026-10-20",
      accountId: "Banco A",
      lines: [{ envelopeId: "Comida", amount: "" }],
      hasFee: false,
    });
  });

  it("pide el monto, la cuenta y el sobre, pero no el concepto", () => {
    expect(operationFormSchema.safeParse(filled).success).toBe(true);
    expect(operationFormSchema.safeParse({ ...filled, description: "" }).success).toBe(true);
    const missing = operationFormSchema.safeParse({
      ...filled,
      accountId: "",
      lines: [{ envelopeId: "", amount: "0" }],
    });
    expect(missing.error?.issues.map((issue) => issue.message)).toEqual([
      "Elige la cuenta.",
      "Elige el sobre.",
      "Escribe un monto mayor que cero.",
    ]);
  });

  it("con comisión, pide su monto", () => {
    const result = operationFormSchema.safeParse({
      ...filled,
      hasFee: true,
      fee: { envelopeId: "Comida", amount: "", description: "Comisión" },
    });
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Escribe el monto de la comisión.",
    ]);
  });

  it("lee lo que ya se puede leer, en céntimos", () => {
    expect(
      formDraft({
        ...filled,
        hasFee: true,
        fee: { envelopeId: "Comida", amount: "1,5", description: " " },
      }),
    ).toEqual({
      kind: "expense",
      accountId: "Banco A",
      lines: [{ envelopeId: "Comida", amountCents: 15000 }],
      fee: { envelopeId: "Comida", amountCents: 150, description: "Comisión" },
    });
    expect(formDraft({ ...filled, lines: [{ envelopeId: "Comida", amount: "" }] }).lines).toEqual(
      [],
    );
  });
});

describe("corregir una operación guardada", () => {
  const saved = {
    kind: "expense",
    day: "2026-10-18",
    description: "Mercado",
    entries: [
      {
        accountId: "Banco A",
        envelopeId: "Comida",
        amountCents: -12000,
        isFee: false,
        description: "",
      },
      {
        accountId: "Banco A",
        envelopeId: "Ahorro",
        amountCents: -3005,
        isFee: false,
        description: "",
      },
      {
        accountId: "Banco A",
        envelopeId: "Comida",
        amountCents: -100,
        isFee: true,
        description: "Comisión",
      },
    ],
  };

  it("vuelve a enseñarla como se tecleó, sin signos", () => {
    expect(operationFormValues(saved)).toEqual({
      kind: "expense",
      accountId: "Banco A",
      day: "2026-10-18",
      description: "Mercado",
      lines: [
        { envelopeId: "Comida", amount: "120,00" },
        { envelopeId: "Ahorro", amount: "30,05" },
      ],
      hasFee: true,
      fee: { envelopeId: "Comida", amount: "1,00", description: "Comisión" },
    });
  });

  it("guardarla sin tocar nada deja los mismos asientos", () => {
    const entries = draftEntries(formDraft(operationFormValues(saved)));
    expect(entries.map((entry) => [entry.envelope_id, entry.amount_cents, entry.is_fee])).toEqual(
      saved.entries.map((entry) => [entry.envelopeId, entry.amountCents, entry.isFee]),
    );
  });
});
