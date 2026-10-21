import { describe, expect, it } from "vitest";

import type { ConceptUsage } from "@/features/envelopes/queries";

import { conceptSuggestions, MAX_SUGGESTIONS } from "./concept-suggestions";

const row = (
  description: string,
  envelopeId: string,
  uses: number,
  extra: Partial<ConceptUsage> = {},
): ConceptUsage => ({
  description,
  kind: "expense",
  accountId: "bank",
  envelopeId,
  uses,
  lastOn: "2026-10-01",
  ...extra,
});

describe("las sugerencias de concepto", () => {
  it("con menos de dos letras, nada", () => {
    expect(conceptSuggestions([row("Mercado", "food", 3)], "m", "expense", "bank")).toEqual([]);
  });

  it("propone el concepto con su sobre, sin mayúsculas ni tildes", () => {
    expect(conceptSuggestions([row("Café", "food", 2)], "CAFE", "expense", "bank")).toEqual([
      { description: "Café", envelopeId: "food" },
    ]);
  });

  it("primero lo que empieza así, luego lo más usado en la cuenta", () => {
    const suggestions = conceptSuggestions(
      [
        row("Pan del mercado", "food", 9),
        row("Mercadito", "food", 3),
        row("Mercado", "food", 2, { accountId: "cash" }),
        row("Mercado", "home", 1),
      ],
      "merca",
      "expense",
      "bank",
    );
    expect(suggestions.map((s) => s.description)).toEqual([
      "Mercadito",
      "Mercado",
      "Pan del mercado",
    ]);
  });

  it("el sobre, el más usado con ese concepto en esa cuenta", () => {
    const [first] = conceptSuggestions(
      [
        row("Mercado", "food", 5, { accountId: "cash" }),
        row("Mercado", "home", 2),
        row("Mercado", "food", 1),
      ],
      "mercado",
      "expense",
      "bank",
    );
    expect(first?.envelopeId).toBe("home");
  });

  it("si nunca se usó en esa cuenta, el más usado en cualquiera", () => {
    const [first] = conceptSuggestions(
      [
        row("Pasaje", "transport", 4, { accountId: "cash" }),
        row("Pasaje", "food", 1, { accountId: "card" }),
      ],
      "pas",
      "expense",
      "bank",
    );
    expect(first?.envelopeId).toBe("transport");
  });

  it("solo del mismo tipo, como se escribió la última vez, y hasta cuatro", () => {
    const rows = [
      row("Sueldo", "savings", 3, { kind: "income" }),
      row("mercado", "food", 1, { lastOn: "2026-09-01" }),
      row("Mercado", "food", 1, { lastOn: "2026-10-15" }),
      ...["Mercado A", "Mercado B", "Mercado C", "Mercado D"].map((name) => row(name, "food", 1)),
    ];
    expect(conceptSuggestions(rows, "su", "expense", "bank")).toEqual([]);
    const suggestions = conceptSuggestions(rows, "merc", "expense", "bank");
    expect(suggestions).toHaveLength(MAX_SUGGESTIONS);
    expect(suggestions[0]?.description).toBe("Mercado");
  });
});
