import { describe, expect, it } from "vitest";

import { summarizeEnvelopes } from "./envelope-summary";
import type { Envelope } from "./queries";

const envelope = (id: string, position: number, isThirdParty = false): Envelope => ({
  id,
  name: id,
  archived: false,
  emoji: null,
  isThirdParty,
  position,
});

describe("summarizeEnvelopes", () => {
  const envelopes = [
    envelope("Otro", 1, true),
    envelope("Ahorro", 2),
    envelope("Comida", 3),
    envelope("Viejo", 4),
  ];

  it("los sobres con dinero, en el orden del presupuesto y «Otro» al final; aparte, los vacíos", () => {
    const { withMoney, empty } = summarizeEnvelopes(envelopes, [
      { envelopeId: "Comida", currency: "VES", balanceCents: -500 },
      { envelopeId: "Otro", currency: "USD", balanceCents: 1000 },
      { envelopeId: "Ahorro", currency: "VES", balanceCents: 4000 },
      { envelopeId: "Ahorro", currency: "USD", balanceCents: 2000 },
      { envelopeId: "Viejo", currency: "VES", balanceCents: 0 },
    ]);
    expect(withMoney.map((s) => [s.envelope.id, s.balances])).toEqual([
      ["Ahorro", { VES: 4000, USD: 2000 }],
      ["Comida", { VES: -500 }],
      ["Otro", { USD: 1000 }],
    ]);
    expect(empty.map((e) => e.id)).toEqual(["Viejo"]);
  });
});
