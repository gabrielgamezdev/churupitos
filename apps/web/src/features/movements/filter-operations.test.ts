import { describe, expect, it } from "vitest";

import type { OperationItem } from "@/features/ledger/queries";
import type { Currency } from "@/lib/money";

import { activeFilters, filterOperations, FROM_EXCEL } from "./filter-operations";

const CURRENCIES: Record<string, Currency> = { bank: "VES", cash: "USD" };
const currencyOf = (accountId: string) => CURRENCIES[accountId];

const item = (
  id: string,
  createdBy: string | null,
  entries: [account: string, envelope: string, description?: string][],
  description = "",
): OperationItem => ({
  id,
  kind: "expense",
  day: "2026-10-20",
  description,
  createdBy,
  authorName: null,
  position: 1,
  entries: entries.map(([accountId, envelopeId, entryDescription = ""]) => ({
    accountId,
    envelopeId,
    amountCents: -100,
    isFee: false,
    description: entryDescription,
  })),
});

const ITEMS = [
  item("mercado", "ana", [["bank", "food"]], "Mercado de la semana"),
  item("pasaje", "beto", [["cash", "transport"]], "Pasaje"),
  item(
    "cafe",
    null,
    [
      ["bank", "food"],
      ["bank", "fees", "Comisión"],
    ],
    "Café",
  ),
];
const ids = (list: OperationItem[]) => list.map((row) => row.id);

describe("los filtros de Movimientos", () => {
  it("sin filtros, todo", () => {
    expect(ids(filterOperations(ITEMS, {}, currencyOf))).toEqual(["mercado", "pasaje", "cafe"]);
  });

  it("por moneda, cuenta y sobre", () => {
    expect(ids(filterOperations(ITEMS, { currency: "USD" }, currencyOf))).toEqual(["pasaje"]);
    expect(ids(filterOperations(ITEMS, { account: "bank" }, currencyOf))).toEqual([
      "mercado",
      "cafe",
    ]);
    expect(ids(filterOperations(ITEMS, { envelope: "fees" }, currencyOf))).toEqual(["cafe"]);
  });

  it("por quién la registró, o lo que vino del Excel", () => {
    expect(ids(filterOperations(ITEMS, { who: "beto" }, currencyOf))).toEqual(["pasaje"]);
    expect(ids(filterOperations(ITEMS, { who: FROM_EXCEL }, currencyOf))).toEqual(["cafe"]);
  });

  it("busca en el concepto y en el de cada asiento, sin mayúsculas ni tildes", () => {
    expect(ids(filterOperations(ITEMS, { q: "cafe" }, currencyOf))).toEqual(["cafe"]);
    expect(ids(filterOperations(ITEMS, { q: "  SEMANA " }, currencyOf))).toEqual(["mercado"]);
    expect(ids(filterOperations(ITEMS, { q: "comision" }, currencyOf))).toEqual(["cafe"]);
  });

  it("los filtros se suman", () => {
    expect(ids(filterOperations(ITEMS, { account: "bank", who: "ana" }, currencyOf))).toEqual([
      "mercado",
    ]);
    expect(activeFilters({ account: "bank", who: "ana", q: "x" })).toBe(2);
  });
});
