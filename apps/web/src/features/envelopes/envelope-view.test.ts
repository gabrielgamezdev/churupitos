import { describe, expect, it } from "vitest";

import type { AccountBalance } from "@/features/balances/use-account-balances";
import type { LedgerEntry } from "@/features/ledger/queries";

import { envelopeAmounts, envelopeCellRows, envelopeMonthBounds } from "./envelope-view";

const account = (accountId: string, currency: "VES" | "USD"): AccountBalance => ({
  accountId,
  name: accountId,
  currency,
  balanceCents: 0,
  thirdPartyCents: 0,
});

describe("la pantalla de un sobre", () => {
  it("dice en qué cuentas está su dinero, en el orden de las hojas", () => {
    const rows = envelopeCellRows(
      [
        { accountId: "Billetera B", currency: "USD", balanceCents: 2000 },
        { accountId: "Banco C", currency: "VES", balanceCents: 0 },
        { accountId: "Banco A", currency: "VES", balanceCents: -500 },
      ],
      [account("Banco A", "VES"), account("Banco C", "VES"), account("Billetera B", "USD")],
    );
    expect(rows.map((row) => [row.account.accountId, row.balanceCents])).toEqual([
      ["Banco A", -500],
      ["Billetera B", 2000],
    ]);
  });

  it("lo que tiene en cada moneda, primero los bolívares y sin las que están en cero", () => {
    expect(
      envelopeAmounts("Ahorro", [
        { envelopeId: "Ahorro", currency: "USD", balanceCents: 2000 },
        { envelopeId: "Ahorro", currency: "VES", balanceCents: 4000 },
        { envelopeId: "Comida", currency: "VES", balanceCents: 100 },
      ]),
    ).toEqual([
      { currency: "VES", balanceCents: 4000 },
      { currency: "USD", balanceCents: 2000 },
    ]);
    expect(
      envelopeAmounts("Ahorro", [{ envelopeId: "Ahorro", currency: "VES", balanceCents: 0 }]),
    ).toEqual([]);
  });

  it("el mes enseña las monedas con algo al empezar, al cerrar o con movimientos", () => {
    const usdEntry = { currency: "USD" } as LedgerEntry;
    const bounds = envelopeMonthBounds(
      "Ahorro",
      [{ envelopeId: "Ahorro", currency: "VES", balanceCents: 4000 }],
      [{ envelopeId: "Ahorro", currency: "VES", balanceCents: 0 }],
      [usdEntry],
    );
    expect(bounds).toEqual([
      { currency: "VES", openingCents: 4000, closingCents: 0 },
      { currency: "USD", openingCents: 0, closingCents: 0 },
    ]);
  });

  it("mientras carga, las cifras quedan sin definir", () => {
    const bounds = envelopeMonthBounds("Ahorro", undefined, undefined, [
      { currency: "VES" } as LedgerEntry,
    ]);
    expect(bounds).toEqual([{ currency: "VES", openingCents: undefined, closingCents: undefined }]);
  });
});
