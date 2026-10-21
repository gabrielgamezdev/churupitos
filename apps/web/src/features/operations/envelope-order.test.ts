import { describe, expect, it } from "vitest";

import type { Envelope } from "@/features/envelopes/queries";

import { envelopeOrder, TOP_ENVELOPES } from "./envelope-order";

const envelope = (id: string, position: number, isThirdParty = false): Envelope => ({
  id,
  name: id,
  archived: false,
  emoji: null,
  isThirdParty,
  position,
});

// Ocho sobres del presupuesto y «Otro».
const ENVELOPES = [
  ...["a", "b", "c", "d", "e", "f", "g", "h"].map((id, index) => envelope(id, index + 1)),
  envelope("otro", 99, true),
];
const ids = (list: Envelope[]) => list.map((row) => row.id);

describe("el orden de los sobres en Registrar", () => {
  it("arriba los más usados en esa cuenta, y a igual uso, el orden del presupuesto", () => {
    const { top } = envelopeOrder(
      ENVELOPES,
      [
        { accountId: "bank", envelopeId: "g", uses: 5 },
        { accountId: "bank", envelopeId: "c", uses: 2 },
        { accountId: "bank", envelopeId: "e", uses: 2 },
        { accountId: "cash", envelopeId: "h", uses: 9 },
      ],
      "bank",
    );
    expect(ids(top).slice(0, 3)).toEqual(["g", "c", "e"]);
  });

  it("con pocos usados, completa con los primeros del presupuesto, sin «Otro»", () => {
    const { top, rest } = envelopeOrder(
      ENVELOPES,
      [{ accountId: "bank", envelopeId: "g", uses: 1 }],
      "bank",
    );
    expect(ids(top)).toEqual(["g", "a", "b", "c", "d", "e"]);
    expect(ids(rest)).toEqual(["f", "h", "otro"]);
  });

  it("«Otro» arriba solo si se usa, y si no, el último de los demás", () => {
    const { top } = envelopeOrder(
      ENVELOPES,
      [{ accountId: "bank", envelopeId: "otro", uses: 3 }],
      "bank",
    );
    expect(top[0]?.id).toBe("otro");
  });

  it("sin cuenta o sin uso, el presupuesto", () => {
    const { top, rest } = envelopeOrder(ENVELOPES, [], "");
    expect(top).toHaveLength(TOP_ENVELOPES);
    expect(ids([...top, ...rest])).toEqual(ids(ENVELOPES));
  });
});
