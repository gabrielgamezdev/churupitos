import { describe, expect, it } from "vitest";

import { moveEntries, moveKind, type MoveSide } from "./move-draft";

const side = (
  accountId: string,
  envelopeId: string,
  currency: "VES" | "USD" = "VES",
): MoveSide => ({
  accountId,
  envelopeId,
  currency,
});

describe("mover sin gastar", () => {
  it("el tipo sale de las dos cuentas", () => {
    expect(moveKind(side("bank", "food"), side("bank", "savings"))).toBe("envelope_transfer");
    expect(moveKind(side("bank", "food"), side("other", "food"))).toBe("account_transfer");
    expect(moveKind(side("cash", "food", "USD"), side("bank", "food"))).toBe("exchange");
  });

  it("entre sobres: sale de uno y entra en el otro", () => {
    const entries = moveEntries({
      from: side("bank", "food"),
      to: side("bank", "savings"),
      amountCents: 5000,
      arrivedCents: 5000,
      fee: null,
    });
    expect(entries.map((e) => [e.account_id, e.envelope_id, e.amount_cents, e.is_fee])).toEqual([
      ["bank", "food", -5000, false],
      ["bank", "savings", 5000, false],
    ]);
  });

  it("un traspaso con comisión: la comisión sale de la cuenta de origen (R16)", () => {
    const entries = moveEntries({
      from: side("bank", "savings"),
      to: side("other", "food"),
      amountCents: 10000,
      arrivedCents: 10000,
      fee: { envelopeId: "savings", amountCents: 150, description: "Comisión" },
    });
    expect(entries.map((e) => [e.account_id, e.envelope_id, e.amount_cents, e.is_fee])).toEqual([
      ["bank", "savings", -10000, false],
      ["other", "food", 10000, false],
      ["bank", "savings", -150, true],
    ]);
  });

  it("un cambio: sale una moneda y llega la otra, cada una con su importe", () => {
    const entries = moveEntries({
      from: side("cash", "savings", "USD"),
      to: side("bank", "savings"),
      amountCents: 1000,
      arrivedCents: 250000,
      fee: null,
    });
    expect(entries.map((e) => e.amount_cents)).toEqual([-1000, 250000]);
  });
});
