import { describe, expect, it } from "vitest";

import type { Envelope } from "@/features/envelopes/queries";

import { envelopeRows } from "./envelope-rows";

const envelope = (id: string, position: number, isThirdParty = false): Envelope => ({
  id,
  name: id,
  emoji: null,
  isThirdParty,
  position,
});

describe("envelopeRows", () => {
  const envelopes = [envelope("Otro", 1, true), envelope("Ahorro", 2), envelope("Comida", 3)];

  it("enseña los sobres con dinero en el orden del presupuesto, con «Otro» al final", () => {
    const rows = envelopeRows(
      [
        { envelopeId: "Comida", balanceCents: -500 },
        { envelopeId: "Otro", balanceCents: 1000 },
        { envelopeId: "Ahorro", balanceCents: 4000 },
      ],
      envelopes,
    );
    expect(rows.map((row) => [row.envelope.id, row.balanceCents])).toEqual([
      ["Ahorro", 4000],
      ["Comida", -500],
      ["Otro", 1000],
    ]);
  });

  it("deja fuera los sobres en cero", () => {
    const rows = envelopeRows([{ envelopeId: "Ahorro", balanceCents: 0 }], envelopes);
    expect(rows).toEqual([]);
  });
});
