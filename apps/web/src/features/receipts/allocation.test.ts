import { describe, expect, it } from "vitest";

import { allocationInBs, proposeAllocation } from "./allocation";

const line = (envelopeId: string, planned: number, allocated: number, fundingNote: string) => ({
  envelopeId,
  plannedUsdCents: planned,
  allocatedUsdCents: allocated,
  fundingNote,
});

describe("el reparto que se propone al cobrar", () => {
  it("los sobres cuya fuente nombra el ingreso, en el orden del presupuesto, con lo que les falta", () => {
    const proposal = proposeAllocation(
      "Bono",
      10000,
      [
        line("food", 4000, 0, "💰 Bono"),
        line("savings", 6000, 1000, "Quincena, bono"),
        line("home", 3000, 0, "Quincena"),
      ],
      ["savings", "food", "home"],
    );
    expect(proposal).toEqual([
      { envelopeId: "savings", usdCents: 5000 },
      { envelopeId: "food", usdCents: 4000 },
    ]);
  });

  it("sin pasar de lo que se cobra, y sin los que ya están entregados", () => {
    const proposal = proposeAllocation(
      "Bono",
      5000,
      [line("a", 4000, 4000, "Bono"), line("b", 3000, 0, "Bono"), line("c", 3000, 0, "Bono")],
      ["a", "b", "c"],
    );
    expect(proposal).toEqual([
      { envelopeId: "b", usdCents: 3000 },
      { envelopeId: "c", usdCents: 2000 },
    ]);
  });

  it("primero los sobres que solo dependen de este ingreso, y lo que sobre a los compartidos", () => {
    const proposal = proposeAllocation(
      "Bono",
      10000,
      [
        // El primero del presupuesto, grande y compartido con la quincena.
        line("savings", 9000, 0, "Quincena, Bono"),
        line("food", 3000, 0, "Bono"),
        line("home", 2000, 0, "Bono"),
      ],
      ["savings", "food", "home"],
      ["Quincena"],
    );
    expect(proposal).toEqual([
      { envelopeId: "savings", usdCents: 5000 },
      { envelopeId: "food", usdCents: 3000 },
      { envelopeId: "home", usdCents: 2000 },
    ]);
  });

  it("si ninguna fuente lo nombra, nada que proponer", () => {
    expect(proposeAllocation("Extra", 1000, [line("a", 1000, 0, "Bono")], ["a"])).toEqual([]);
  });
});

describe("los bolívares de cada línea (R9)", () => {
  it("a la tasa del cobro: $100 a Bs 400, $60 y $40", () => {
    expect(allocationInBs([6000, 4000], 4000000, 10000)).toEqual([2400000, 1600000]);
  });

  it("la última se queda con la diferencia del redondeo, y suman justo lo que llegó", () => {
    const bs = allocationInBs([100, 100, 100], 100000, 300);
    expect(bs).toEqual([33333, 33333, 33334]);
    expect(bs.reduce((sum, cents) => sum + cents, 0)).toBe(100000);
  });

  it("con importes grandes no pierde céntimos", () => {
    const bs = allocationInBs([123457, 876543], 98765432109, 1000000);
    expect(bs[0]).toBe(12193283952);
    expect(bs.reduce((sum, cents) => sum + cents, 0)).toBe(98765432109);
  });

  it("mientras no suma lo cobrado, cada una va a la tasa, sin ajustar la última", () => {
    expect(allocationInBs([5000], 4000000, 10000)).toEqual([2000000]);
  });
});
