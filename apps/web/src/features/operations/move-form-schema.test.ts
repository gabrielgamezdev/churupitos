import { describe, expect, it } from "vitest";

import type { Currency } from "@/lib/money";

import {
  defaultMoveDescription,
  emptyMoveForm,
  formMoveKind,
  moveDraft,
  moveFormSchema,
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
});
