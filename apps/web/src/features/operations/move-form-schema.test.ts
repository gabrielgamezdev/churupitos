import { describe, expect, it } from "vitest";

import type { Currency } from "@/lib/money";

import { moveEntries } from "./move-draft";

import {
  defaultMoveDescription,
  emptyMoveForm,
  formMoveKind,
  moveDraft,
  moveFormSchema,
  moveFormValues,
} from "./move-form-schema";

const CURRENCIES: Record<string, Currency> = { bank: "VES", other: "VES", cash: "USD" };
const currencyOf = (accountId: string) => CURRENCIES[accountId];
const schema = moveFormSchema(currencyOf);
const messages = (values: unknown) =>
  schema.safeParse(values).error?.issues.map((issue) => issue.message);

const base = {
  ...emptyMoveForm({ amount: "", accountId: "bank", day: "2026-10-21", description: "" }),
  fromEnvelope: "food",
  toEnvelope: "savings",
  amount: "50",
};

describe("el formulario de Mover", () => {
  it("abre con la cuenta de destino igual a la de origen", () => {
    const empty = emptyMoveForm({
      amount: "",
      accountId: "bank",
      day: "2026-10-21",
      description: "",
    });
    expect([empty.fromAccount, empty.toAccount, empty.fromEnvelope, empty.toEnvelope]).toEqual([
      "bank",
      "bank",
      "",
      "",
    ]);
  });

  it("entre sobres de una cuenta: los dos sobres tienen que ser distintos", () => {
    expect(messages(base)).toBeUndefined();
    expect(messages({ ...base, toEnvelope: "food" })).toEqual([
      "Elige otro sobre: es el mismo de donde sale.",
    ]);
    expect(formMoveKind(base, currencyOf)).toBe("envelope_transfer");
  });

  it("un traspaso puede dejar el mismo sobre", () => {
    const transfer = { ...base, toAccount: "other", toEnvelope: "food" };
    expect(messages(transfer)).toBeUndefined();
    expect(formMoveKind(transfer, currencyOf)).toBe("account_transfer");
  });

  it("un cambio pide lo que llega, y lo usa", () => {
    const exchange = { ...base, fromAccount: "cash", toAccount: "bank" };
    expect(messages(exchange)).toEqual(["Escribe cuánto llega."]);
    expect(moveDraft(exchange, currencyOf)).toBeNull();
    const done = { ...exchange, arrived: "2.500" };
    expect(messages(done)).toBeUndefined();
    expect(moveDraft(done, currencyOf)).toMatchObject({ amountCents: 5000, arrivedCents: 250000 });
  });

  it("la comisión sale, si no se cambia, del sobre de origen", () => {
    const draft = moveDraft(
      {
        ...base,
        toAccount: "other",
        hasFee: true,
        fee: { envelopeId: "", amount: "1,5", description: " " },
      },
      currencyOf,
    );
    expect(draft?.fee).toEqual({ envelopeId: "food", amountCents: 150, description: "Comisión" });
  });

  it("sin concepto, uno como el del Excel", () => {
    const names = {
      fromAccount: "Banco A",
      toAccount: "Banco C",
      fromEnvelope: "Comida",
      toEnvelope: "Ahorro",
    };
    expect(defaultMoveDescription("envelope_transfer", names)).toBe("De Comida a Ahorro");
    expect(defaultMoveDescription("account_transfer", names)).toBe("De Banco A a Banco C");
    expect(defaultMoveDescription("exchange", names)).toBe("Cambio de Banco A a Banco C");
  });

  it("un movimiento guardado vuelve al formulario como se escribió", () => {
    const values = moveFormValues({
      day: "2026-10-20",
      description: "Al Banco C",
      entries: [
        {
          accountId: "bank",
          envelopeId: "savings",
          amountCents: -10000,
          isFee: false,
          description: "",
        },
        {
          accountId: "other",
          envelopeId: "food",
          amountCents: 10000,
          isFee: false,
          description: "",
        },
        {
          accountId: "bank",
          envelopeId: "savings",
          amountCents: -150,
          isFee: true,
          description: "Comisión",
        },
      ],
    });
    expect(values).toMatchObject({
      fromAccount: "bank",
      fromEnvelope: "savings",
      toAccount: "other",
      toEnvelope: "food",
      amount: "100,00",
      hasFee: true,
      fee: { envelopeId: "savings", amount: "1,50", description: "Comisión" },
    });
    expect(moveDraft(values!, currencyOf)).toMatchObject({
      amountCents: 10000,
      arrivedCents: 10000,
    });
  });

  it("uno de varias partes no se corrige desde la app", () => {
    expect(
      moveFormValues({
        day: "2026-10-20",
        description: "Cambio repartido",
        entries: [
          { accountId: "cash", envelopeId: "a", amountCents: -100, isFee: false, description: "" },
          { accountId: "cash", envelopeId: "b", amountCents: -100, isFee: false, description: "" },
          { accountId: "bank", envelopeId: "a", amountCents: 50000, isFee: false, description: "" },
          { accountId: "bank", envelopeId: "b", amountCents: 50000, isFee: false, description: "" },
        ],
      }),
    ).toBeNull();
  });
});

describe("corregir un movimiento sin perder nada (M13)", () => {
  const currencies: Record<string, Currency> = { "Banco A": "VES", "Banco B": "VES" };
  const entry = (
    accountId: string,
    envelopeId: string,
    amountCents: number,
    isFee = false,
    description = "",
  ) => ({ accountId, envelopeId, amountCents, isFee, description });

  it("conserva el concepto de cada lado y todas las comisiones, cada una en su cuenta", () => {
    const entries = [
      entry("Banco A", "Ahorro", -5000, false, "Sale"),
      entry("Banco B", "Ahorro", 5000, false, "Llega"),
      entry("Banco A", "Ahorro", -100, true, "Una"),
      entry("Banco B", "Comida", -200, true, "En la de destino"),
      entry("Banco A", "Comida", -300, true, "Otra"),
    ];
    const values = moveFormValues({ day: "2026-10-18", description: "X", entries });
    const draft = moveDraft(values!, (account) => currencies[account]);
    const saved = moveEntries(draft!).map((e) => [
      e.account_id,
      e.envelope_id,
      e.amount_cents,
      e.is_fee,
      e.description,
    ]);
    expect(saved).toHaveLength(entries.length);
    expect(saved).toEqual(
      expect.arrayContaining(
        entries.map((e) => [e.accountId, e.envelopeId, e.amountCents, e.isFee, e.description]),
      ),
    );
  });
});
