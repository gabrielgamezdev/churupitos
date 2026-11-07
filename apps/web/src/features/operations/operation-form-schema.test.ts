import { describe, expect, it } from "vitest";

import { draftEntries } from "./operation-draft";
import {
  emptyOperationForm,
  formDraft,
  operationFormSchema,
  operationFormValues,
  splitPending,
} from "./operation-form-schema";

const filled = {
  ...emptyOperationForm("2026-10-20", "Banco A", "Comida"),
  description: "Mercado",
  total: "150",
};

describe("el formulario de Registrar", () => {
  it("abre en gasto, con hoy y con lo que ya viene elegido", () => {
    expect(emptyOperationForm("2026-10-20", "Banco A", "Comida")).toMatchObject({
      kind: "expense",
      day: "2026-10-20",
      accountId: "Banco A",
      total: "",
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
      total: "0",
      lines: [{ envelopeId: "", amount: "" }],
    });
    expect(missing.error?.issues.map((issue) => issue.message)).toEqual([
      "Elige la cuenta.",
      "Escribe un monto mayor que cero.",
      "Elige el sobre.",
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
    expect(formDraft({ ...filled, total: "" }).lines).toEqual([]);
  });

  it("al repartir, cada sobre lleva su parte y entre todas suman el total", () => {
    const split = {
      ...filled,
      total: "100",
      lines: [
        { envelopeId: "Comida", amount: "60" },
        { envelopeId: "Casa", amount: "30" },
      ],
    };
    const messages = (values: typeof split) =>
      operationFormSchema.safeParse(values).error?.issues.map((issue) => issue.message);
    expect(splitPending(split)).toBe(1000);
    expect(messages(split)).toEqual(["Falta repartir parte del monto."]);

    const done = { ...split, lines: [split.lines[0]!, { envelopeId: "Casa", amount: "40" }] };
    expect(splitPending(done)).toBe(0);
    expect(messages(done)).toBeUndefined();
    expect(formDraft(done).lines).toEqual([
      { envelopeId: "Comida", amountCents: 6000 },
      { envelopeId: "Casa", amountCents: 4000 },
    ]);

    const over = { ...split, lines: [split.lines[0]!, { envelopeId: "Casa", amount: "50" }] };
    expect(splitPending(over)).toBe(-1000);
    expect(messages(over)).toEqual(["Lo repartido pasa del monto."]);
  });

  it("al repartir, cada sobre pide su parte", () => {
    const result = operationFormSchema.safeParse({
      ...filled,
      total: "100",
      lines: [
        { envelopeId: "Comida", amount: "100" },
        { envelopeId: "Casa", amount: "" },
      ],
    });
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Escribe cuánto va a este sobre.",
    ]);
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
    expect(operationFormValues(saved)).toMatchObject({
      kind: "expense",
      accountId: "Banco A",
      day: "2026-10-18",
      description: "Mercado",
      total: "150,05",
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

describe("corregir sin perder nada (M13)", () => {
  const entry = (envelopeId: string, amountCents: number, isFee = false, description = "") => ({
    accountId: "Banco A",
    envelopeId,
    amountCents,
    isFee,
    description,
  });
  const asEntries = (entries: ReturnType<typeof entry>[]) =>
    entries.map((e) => ({
      account_id: e.accountId,
      envelope_id: e.envelopeId,
      amount_cents: e.amountCents,
      is_fee: e.isFee,
      description: e.description,
    }));
  const roundTrip = (kind: string, entries: ReturnType<typeof entry>[]) =>
    draftEntries(
      formDraft(operationFormValues({ kind, day: "2026-10-18", description: "X", entries })),
    );

  it("una comisión suelta sigue siéndolo", () => {
    const entries = [entry("Comida", -100, true, "Mantenimiento")];
    expect(roundTrip("expense", entries)).toEqual(asEntries(entries));
    expect(
      operationFormValues({ kind: "expense", day: "2026-10-18", description: "X", entries }),
    ).toMatchObject({ isFee: true, total: "1,00", hasFee: false });
  });

  it("varias comisiones se conservan todas, en su orden", () => {
    const entries = [
      entry("Comida", -5000),
      entry("Comida", -100, true, "Primera"),
      entry("Ahorro", -200, true, "Segunda"),
      entry("Ahorro", -300, true, "Tercera"),
    ];
    expect(roundTrip("expense", entries)).toEqual(asEntries(entries));
  });

  it("un ingreso con varias comisiones, también", () => {
    const entries = [
      entry("Comida", 5000),
      entry("Comida", -100, true, "Una"),
      entry("Comida", -200, true, "Otra"),
    ];
    expect(roundTrip("income", entries)).toEqual(asEntries(entries));
  });

  it("el concepto de cada línea se conserva", () => {
    const entries = [entry("Comida", -5000, false, "Pan"), entry("Ahorro", -2000, false, "Leche")];
    expect(roundTrip("expense", entries)).toEqual(asEntries(entries));
  });

  it("marcar un gasto como comisión marca sus asientos; un ingreso nunca lo es", () => {
    const values = { ...filled, isFee: true };
    expect(draftEntries(formDraft(values)).every((e) => e.is_fee)).toBe(true);
    expect(draftEntries(formDraft({ ...values, kind: "income" })).some((e) => e.is_fee)).toBe(
      false,
    );
  });
});
