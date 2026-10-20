import { describe, expect, it } from "vitest";

import type { Envelope } from "@/features/envelopes/queries";

import { budgetBalance, formatRate, incomeTotals, summarizePlan } from "./budget-view";
import type { BudgetLine, ExpectedIncome } from "./queries";

const income = (expectedUsdCents: number, received: boolean): ExpectedIncome => ({
  id: String(expectedUsdCents),
  name: "Bono",
  emoji: null,
  expectedUsdCents,
  receipt: received
    ? {
        operationId: "op",
        day: "2026-01-10",
        accountId: "Banco A",
        currency: "VES",
        amountCents: expectedUsdCents * 400,
        usdCents: expectedUsdCents,
      }
    : null,
});

describe("los ingresos del mes", () => {
  it("suman como el Excel: lo cobrado son los ✅ y lo que falta, los ⏳", () => {
    expect(incomeTotals([income(100000, true), income(10000, false), income(5000, true)])).toEqual({
      expectedUsdCents: 115000,
      receivedUsdCents: 105000,
      pendingUsdCents: 10000,
    });
    expect(incomeTotals([])).toEqual({
      expectedUsdCents: 0,
      receivedUsdCents: 0,
      pendingUsdCents: 0,
    });
  });

  it("R8: la tasa de un cobro, con dos decimales", () => {
    expect(formatRate(40000000, 100000)).toBe("400,00");
    // Bs 1.234,56 por $3: 411,52 periódico. barrido:permitido (cifra inventada)
    expect(formatRate(123456, 300)).toBe("411,52");
    expect(formatRate(1250000000, 100000)).toBe("12.500,00"); // barrido:permitido (cifra inventada)
  });
});

const envelope = (id: string, position: number): Envelope => ({
  id,
  name: id,
  emoji: null,
  isThirdParty: false,
  position,
});

const line = (envelopeId: string, plannedUsdCents: number, isDelivered: boolean): BudgetLine => ({
  id: envelopeId,
  envelopeId,
  plannedUsdCents,
  allocatedUsdCents: isDelivered ? plannedUsdCents : 0,
  allocatedVesCents: 0,
  isDelivered,
  fundingNote: "",
  actionNote: "",
});

describe("el plan del mes", () => {
  const envelopes = [envelope("Ahorro", 1), envelope("Comida", 2), envelope("Viajes", 3)];

  it("va en el orden del presupuesto, con los de $0 aparte", () => {
    const plan = summarizePlan(
      [line("Viajes", 0, true), line("Comida", 40000, false), line("Ahorro", 65000, true)],
      envelopes,
    );
    expect(plan.planned.map((row) => row.envelope.id)).toEqual(["Ahorro", "Comida"]);
    expect(plan.unplanned.map((row) => row.envelope.id)).toEqual(["Viajes"]);
  });

  it("suma como el Excel: lo entregado son los ✅ y lo que falta, los ⏳", () => {
    const plan = summarizePlan(
      [line("Ahorro", 65000, true), line("Comida", 40000, false), line("Viajes", 0, true)],
      envelopes,
    );
    expect(plan.totals).toEqual({
      plannedUsdCents: 105000,
      deliveredUsdCents: 65000,
      pendingUsdCents: 40000,
    });
  });

  it("R12: el cuadre dice cuánto se aparta el mes, y cero es que cuadra", () => {
    const checks = {
      month: "2026-01",
      expectedUsdCents: 115000,
      plannedUsdCents: 115000,
      receivedVesCents: 4000000,
      allocatedVesCents: 4000000,
    };
    expect(budgetBalance(checks)).toEqual({ planOverUsdCents: 0, allocatedOverVesCents: 0 });
    expect(budgetBalance({ ...checks, plannedUsdCents: 110000 })).toEqual({
      planOverUsdCents: -5000,
      allocatedOverVesCents: 0,
    });
  });
});
