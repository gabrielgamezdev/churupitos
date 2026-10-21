import { describe, expect, it } from "vitest";

import type { Currency } from "@/lib/money";

import { summarizeOperation } from "./operation-summary";

const CURRENCIES: Record<string, Currency> = { bank: "VES", cash: "USD" };
const currencyOf = (accountId: string) => CURRENCIES[accountId];

describe("una operación en una fila", () => {
  it("un gasto con su comisión suma las dos y enseña solo el sobre del gasto", () => {
    const summary = summarizeOperation(
      [
        { accountId: "bank", envelopeId: "food", amountCents: -100000, isFee: false },
        { accountId: "bank", envelopeId: "fees", amountCents: -500, isFee: true },
      ],
      currencyOf,
    );
    expect(summary.totals).toEqual([{ currency: "VES", cents: -100500, movedCents: 0 }]);
    expect(summary.accountIds).toEqual(["bank"]);
    expect(summary.envelopeIds).toEqual(["food"]);
  });

  it("un gasto repartido enseña cada sobre una vez", () => {
    const summary = summarizeOperation(
      [
        { accountId: "bank", envelopeId: "food", amountCents: -2000, isFee: false },
        { accountId: "bank", envelopeId: "home", amountCents: -3000, isFee: false },
        { accountId: "bank", envelopeId: "food", amountCents: -1000, isFee: false },
      ],
      currencyOf,
    );
    expect(summary.totals).toEqual([{ currency: "VES", cents: -6000, movedCents: 0 }]);
    expect(summary.envelopeIds).toEqual(["food", "home"]);
  });

  it("cada moneda va por su lado, y una cuenta desconocida no suma", () => {
    const summary = summarizeOperation(
      [
        { accountId: "cash", envelopeId: "savings", amountCents: -1000, isFee: false },
        { accountId: "bank", envelopeId: "savings", amountCents: 400000, isFee: false },
        { accountId: "gone", envelopeId: "savings", amountCents: 50, isFee: false },
      ],
      currencyOf,
    );
    expect(summary.totals).toEqual([
      { currency: "USD", cents: -1000, movedCents: 0 },
      { currency: "VES", cents: 400000, movedCents: 400000 },
    ]);
  });

  it("un traspaso entre sobres da cero, y dice cuánto pasó", () => {
    const summary = summarizeOperation(
      [
        { accountId: "bank", envelopeId: "food", amountCents: -2500, isFee: false },
        { accountId: "bank", envelopeId: "home", amountCents: 2500, isFee: false },
      ],
      currencyOf,
    );
    expect(summary.totals).toEqual([{ currency: "VES", cents: 0, movedCents: 2500 }]);
  });
});
