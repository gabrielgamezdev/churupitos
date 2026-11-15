import { describe, expect, it } from "vitest";

import { allocationInBs, fundingShares, proposeAllocation, sharesOf } from "./allocation";

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

describe("cuánto pone cada fuente, deducido del plan (R22)", () => {
  const incomes = [
    { id: "bonus", name: "Bono", expectedUsdCents: 81500 },
    { id: "card", name: "Tarjeta", expectedUsdCents: 7000 },
    { id: "last", name: "Último", expectedUsdCents: 6500 },
  ];
  const plan = [
    { envelopeId: "outings", plannedUsdCents: 68000, fundingNote: "💰 Bono" },
    { envelopeId: "food", plannedUsdCents: 12000, fundingNote: "🥪 Tarjeta, 💰 Bono" },
    { envelopeId: "person", plannedUsdCents: 15000, fundingNote: "💰 Bono, 💵 Último" },
  ];

  it("lo que una fuente solo puede poner en un sobre va ahí, y la otra pone lo que falta", () => {
    expect(fundingShares(incomes, plan)).toEqual(
      expect.arrayContaining([
        { incomeId: "bonus", envelopeId: "outings", usdCents: 68000 },
        { incomeId: "card", envelopeId: "food", usdCents: 7000 },
        { incomeId: "bonus", envelopeId: "food", usdCents: 5000 },
        { incomeId: "last", envelopeId: "person", usdCents: 6500 },
        { incomeId: "bonus", envelopeId: "person", usdCents: 8500 },
      ]),
    );
  });

  it("si el plan no suma lo esperado de cada ingreso, no se deduce", () => {
    const short = incomes.map((income) =>
      income.id === "bonus" ? { ...income, expectedUsdCents: 90000 } : income,
    );
    expect(fundingShares(short, plan)).toBeNull();
  });

  it("si dos ingresos llenan los mismos dos sobres, no hay forma de saberlo", () => {
    expect(
      fundingShares(
        [
          { id: "a", name: "Bono", expectedUsdCents: 10000 },
          { id: "b", name: "Quincena", expectedUsdCents: 10000 },
        ],
        [
          { envelopeId: "x", plannedUsdCents: 10000, fundingNote: "Bono, Quincena" },
          { envelopeId: "y", plannedUsdCents: 10000, fundingNote: "Quincena, Bono" },
        ],
      ),
    ).toBeNull();
  });

  it("al cobrar, cada sobre recibe su parte, y no la de la otra fuente", () => {
    const lines = plan.map((l) => ({ ...l, allocatedUsdCents: 0 }));
    const order = ["outings", "food", "person"];
    const shares = sharesOf(fundingShares(incomes, plan), "bonus");
    expect(proposeAllocation("Bono", 81500, lines, order, ["Tarjeta", "Último"], shares)).toEqual([
      { envelopeId: "outings", usdCents: 68000 },
      { envelopeId: "food", usdCents: 5000 },
      { envelopeId: "person", usdCents: 8500 },
    ]);
    // Sin ella, el sobre compartido que va antes se lleva su plan entero.
    expect(proposeAllocation("Bono", 81500, lines, order, ["Tarjeta", "Último"])).toEqual([
      { envelopeId: "outings", usdCents: 68000 },
      { envelopeId: "food", usdCents: 12000 },
      { envelopeId: "person", usdCents: 1500 },
    ]);
  });

  it("su parte, sin pasar de lo que le falta al sobre", () => {
    const lines = plan.map((l) => ({
      ...l,
      allocatedUsdCents: l.envelopeId === "food" ? 10000 : 0,
    }));
    const shares = sharesOf(fundingShares(incomes, plan), "bonus");
    expect(
      proposeAllocation("Bono", 81500, lines, ["outings", "food", "person"], [], shares),
    ).toContainEqual({ envelopeId: "food", usdCents: 2000 });
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
