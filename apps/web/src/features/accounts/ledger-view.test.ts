import { describe, expect, it } from "vitest";

import { envelopeRows, groupByDay } from "./ledger-view";
import type { Envelope, LedgerEntry } from "./queries";

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

describe("groupByDay", () => {
  const entry = (entryId: string, day: string) => ({ entryId, day }) as LedgerEntry;

  it("agrupa por día sin cambiar el orden", () => {
    const days = groupByDay([
      entry("c", "2026-10-15"),
      entry("b", "2026-10-15"),
      entry("a", "2026-10-13"),
    ]);
    expect(days.map((d) => [d.day, d.entries.map((e) => e.entryId)])).toEqual([
      ["2026-10-15", ["c", "b"]],
      ["2026-10-13", ["a"]],
    ]);
  });
});
