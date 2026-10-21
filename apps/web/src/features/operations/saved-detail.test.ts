import { describe, expect, it } from "vitest";

import { formatMoney } from "@/lib/money";

import type { EntryInput } from "./operation-draft";
import { savedDetail } from "./saved-detail";

const ENVELOPES: Record<string, { name: string; emoji: string | null }> = {
  food: { name: "Comida", emoji: "🍔" },
  home: { name: "Casa", emoji: null },
};
const envelopeOf = (id: string) => ENVELOPES[id];

const entry = (envelopeId: string, amountCents: number, isFee = false): EntryInput => ({
  account_id: "bank",
  envelope_id: envelopeId,
  amount_cents: amountCents,
  is_fee: isFee,
  description: "",
});

describe("la segunda línea del aviso al guardar", () => {
  it("dice cómo queda el sobre, con la comisión que salió de él", () => {
    const detail = savedDetail(
      [entry("food", -10000), entry("food", -100, true)],
      [{ envelopeId: "food", beforeCents: 50000, afterCents: 39900 }],
      envelopeOf,
      "VES",
    );
    expect(detail).toBe(`🍔 Comida queda en ${formatMoney(39900, "VES")}`);
  });

  it("un descubierto se dice igual, con su signo (R6)", () => {
    const detail = savedDetail(
      [entry("home", -2000)],
      [{ envelopeId: "home", beforeCents: 1000, afterCents: -1000 }],
      envelopeOf,
      "USD",
    );
    expect(detail).toBe(`Casa queda en ${formatMoney(-1000, "USD")}`);
  });

  it("un gasto repartido dice entre cuántos sobres", () => {
    const detail = savedDetail(
      [entry("food", -1000), entry("home", -1000), entry("home", -50, true)],
      [],
      envelopeOf,
      "VES",
    );
    expect(detail).toBe("Repartido entre 2 sobres");
  });

  it("sin los saldos de la cuenta, nada", () => {
    expect(savedDetail([entry("food", -1000)], [], envelopeOf, "VES")).toBeUndefined();
  });
});
