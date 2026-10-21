import { describe, expect, it } from "vitest";

import type { Currency } from "@/lib/money";

import {
  emptyReceiveForm,
  receiptEntries,
  receiveFormSchema,
  receivePending,
} from "./receive-form-schema";

const CURRENCIES: Record<string, Currency> = { bank: "VES", cash: "USD" };
const currencyOf = (accountId: string) => CURRENCIES[accountId];
const messages = (values: unknown) =>
  receiveFormSchema(currencyOf)
    .safeParse(values)
    .error?.issues.map((issue) => issue.message);

const form = emptyReceiveForm({
  accountId: "bank",
  day: "2026-10-21",
  incomeName: "Bono",
  expectedUsdCents: 10000,
  proposal: [
    { envelopeId: "savings", usdCents: 6000 },
    { envelopeId: "food", usdCents: 4000 },
  ],
});

describe("el formulario de Cobrar", () => {
  it("abre con los dólares esperados y el reparto propuesto", () => {
    expect(form.usd).toBe("100,00");
    expect(form.description).toBe("Bono");
    expect(form.lines).toEqual([
      { envelopeId: "savings", usd: "60,00" },
      { envelopeId: "food", usd: "40,00" },
    ]);
  });

  it("pide lo que llegó", () => {
    expect(messages(form)).toEqual(["Escribe cuánto llegó."]);
  });

  it("no guarda si el reparto no suma los dólares", () => {
    const short = { ...form, received: "40.000", lines: [form.lines[0]!] };
    expect(receivePending(short, "VES")).toBe(4000);
    expect(messages(short)).toEqual(["Falta repartir parte de los dólares."]);
    expect(receiptEntries(short, "VES")).toBeNull();
  });

  it("en bolívares, cada línea con sus Bs a la tasa y sus dólares (R9)", () => {
    const entries = receiptEntries({ ...form, received: "40.000" }, "VES");
    expect(entries?.map((e) => [e.envelope_id, e.amount_cents, e.usd_value_cents])).toEqual([
      ["savings", 2400000, 6000],
      ["food", 1600000, 4000],
    ]);
  });

  it("en dólares, lo que llegó son los dólares, y la comisión aparte", () => {
    const usd = {
      ...form,
      accountId: "cash",
      received: "100",
      hasFee: true,
      fee: { envelopeId: "", amount: "1", description: "" },
    };
    expect(messages(usd)).toBeUndefined();
    expect(
      receiptEntries(usd, "USD")?.map((e) => [
        e.envelope_id,
        e.amount_cents,
        e.usd_value_cents,
        e.is_fee,
      ]),
    ).toEqual([
      ["savings", 6000, null, false],
      ["food", 4000, null, false],
      ["savings", -100, null, true],
    ]);
  });

  it("sin propuesta del plan, una línea en blanco", () => {
    const blank = emptyReceiveForm({
      accountId: "",
      day: "2026-10-21",
      incomeName: "Extra",
      expectedUsdCents: 2000,
      proposal: [],
    });
    expect(blank.lines).toEqual([{ envelopeId: "", usd: "" }]);
  });
});
