import { describe, expect, it } from "vitest";

import type { Debt } from "@/features/debts/queries";

import { attention, incomesToReceive, monthToPrepare } from "./attention";

const TODAY = "2026-10-20";

const debt = (id: string, dueOn: string | null, extra: Partial<Debt> = {}): Debt => ({
  id,
  direction: "payable",
  description: id,
  amountCents: 1000,
  currency: "USD",
  dueOn,
  paidOn: null,
  position: 1,
  ...extra,
});

describe("lo que Inicio pone a revisar", () => {
  it("los descubiertos, por moneda y del más hondo al menos", () => {
    const { overdrafts } = attention(
      [
        { accountId: "a", envelopeId: "x", currency: "USD", balanceCents: -100 },
        { accountId: "a", envelopeId: "y", currency: "VES", balanceCents: -500 },
        { accountId: "b", envelopeId: "z", currency: "VES", balanceCents: -9000 },
        { accountId: "b", envelopeId: "w", currency: "VES", balanceCents: 300 },
      ],
      [],
      TODAY,
    );
    expect(overdrafts.map((cell) => cell.envelopeId)).toEqual(["z", "y", "x"]);
  });

  it("lo que deben que venció o vence en 7 días, por fecha", () => {
    const { dueSoon } = attention(
      [],
      [
        debt("en-siete", "2026-10-27"),
        debt("en-ocho", "2026-10-28"),
        debt("vencida", "2026-10-15"),
        debt("hoy", TODAY),
        debt("sin-fecha", null),
        debt("pagada", "2026-10-21", { paidOn: "2026-10-19" }),
        debt("les-deben", "2026-10-21", { direction: "receivable" }),
      ],
      TODAY,
    );
    expect(dueSoon.map((row) => row.id)).toEqual(["vencida", "hoy", "en-siete"]);
  });
});

describe("lo que falta por cobrar del mes", () => {
  const income = (id: string, usd: number, received: boolean) => ({
    id,
    name: id,
    emoji: null,
    expectedUsdCents: usd,
    receipt: received
      ? {
          operationId: "op",
          day: TODAY,
          accountId: "a",
          currency: "USD" as const,
          amountCents: usd,
          usdCents: usd,
        }
      : null,
  });

  it("cuántos siguen pendientes y lo que suman en dólares", () => {
    expect(
      incomesToReceive([
        income("a", 10000, true),
        income("b", 20000, false),
        income("c", 5000, false),
      ]),
    ).toEqual({ count: 2, usdCents: 25000 });
  });

  it("con todo cobrado, nada que revisar", () => {
    expect(incomesToReceive([income("a", 10000, true)])).toBeNull();
    expect(incomesToReceive([])).toBeNull();
  });
});

describe("el mes siguiente sin preparar (M10)", () => {
  it("desde el 25, si el siguiente no tiene presupuesto", () => {
    expect(monthToPrepare("2026-10", "2026-10-24")).toBeNull();
    expect(monthToPrepare("2026-10", "2026-10-25")).toBe("2026-11");
  });

  it("con el siguiente ya preparado, nada", () => {
    expect(monthToPrepare("2026-11", "2026-10-28")).toBeNull();
  });

  it("si el mes en curso no tiene presupuesto, enseguida, y el que sigue al último", () => {
    expect(monthToPrepare("2026-10", "2026-11-03")).toBe("2026-11");
    expect(monthToPrepare("2026-09", "2026-11-03")).toBe("2026-10");
  });

  it("sin ningún presupuesto, nada que copiar", () => {
    expect(monthToPrepare(undefined, "2026-10-28")).toBeNull();
  });
});
