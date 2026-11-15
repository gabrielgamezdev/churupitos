import { describe, expect, it } from "vitest";

import type { BudgetLine, ExpectedIncome } from "@/features/budget/queries";

import {
  actionChoices,
  fundingNames,
  monthRows,
  planFormSchema,
  planFromMonth,
  planFromPrevious,
  planTotals,
  plannedCents,
  renameFunding,
  toggleFunding,
  unknownFunding,
  usedActions,
} from "./plan-form-schema";

const income = (id: string, name: string, usd: number, received = false): ExpectedIncome => ({
  id,
  name,
  emoji: name === "Bono" ? "💰" : null,
  expectedUsdCents: usd,
  receipt: received
    ? {
        operationId: "op",
        day: "2026-10-05",
        accountId: "bank",
        currency: "USD",
        amountCents: usd,
        usdCents: usd,
      }
    : null,
});

const line = (envelopeId: string, planned: number, funding = "", action = ""): BudgetLine => ({
  id: `line-${envelopeId}`,
  envelopeId,
  plannedUsdCents: planned,
  allocatedUsdCents: 0,
  allocatedVesCents: 0,
  isDelivered: false,
  fundingNote: funding,
  actionNote: action,
});

const ORDER = ["savings", "food", "home"];

describe("un mes en «Planear»", () => {
  const month = planFromMonth(
    [income("a", "Bono", 10000, true), income("b", "Quincena", 5000)],
    [line("home", 0), line("food", 4000, "Bono"), line("savings", 6000, "Bono", "Cambiar")],
    ORDER,
  );

  it("los ingresos en su orden, y el plan en el del presupuesto; $0 queda vacío", () => {
    expect(month.incomes.map((i) => [i.name, i.usd, i.received])).toEqual([
      ["Bono", "100,00", true],
      ["Quincena", "50,00", false],
    ]);
    expect(month.lines.map((l) => [l.envelopeId, l.usd])).toEqual([
      ["savings", "60,00"],
      ["food", "40,00"],
      ["home", ""],
    ]);
  });

  it("el siguiente se copia con ingresos nuevos y sin cobrar, y el mismo plan (R19)", () => {
    let n = 0;
    const next = planFromPrevious(
      [income("a", "Bono", 10000, true)],
      [line("savings", 6000, "Bono", "Cambiar")],
      ORDER,
      () => `new-${++n}`,
    );
    expect(next.incomes).toEqual([
      { id: "new-1", name: "Bono", emoji: "💰", usd: "100,00", received: false },
    ]);
    expect(next.lines).toEqual([
      {
        envelopeId: "savings",
        usd: "60,00",
        fundingNote: "Bono",
        actionNote: "Cambiar",
        added: false,
      },
    ]);
  });

  it("lo que guarda la base, en céntimos y sin espacios de más", () => {
    const rows = monthRows({
      incomes: [{ id: "a", name: " Bono ", emoji: "💰", usd: "100,00", received: false }],
      lines: [{ envelopeId: "home", usd: "", fundingNote: " Bono ", actionNote: "", added: false }],
    });
    expect(rows).toEqual({
      incomes: [{ id: "a", name: "Bono", emoji: "💰", expected_usd_cents: 10000 }],
      lines: [{ envelope_id: "home", planned_usd_cents: 0, funding_note: "Bono", action_note: "" }],
    });
  });
});

describe("el cuadre mientras se planea (R12 a)", () => {
  it("lo esperado, lo planeado y lo que falta por planear", () => {
    expect(
      planTotals({
        incomes: [{ id: "a", name: "Bono", emoji: null, usd: "100,00", received: false }],
        lines: [
          { envelopeId: "savings", usd: "60,00", fundingNote: "", actionNote: "", added: false },
          { envelopeId: "home", usd: "", fundingNote: "", actionNote: "", added: false },
        ],
      }),
    ).toEqual({ expectedUsdCents: 10000, plannedUsdCents: 6000, pendingUsdCents: 4000 });
  });

  it("vacío es $0 para un sobre, pero no para un ingreso", () => {
    expect(plannedCents("")).toBe(0);
    expect(plannedCents("12,50")).toBe(1250);
    const result = planFormSchema.safeParse({
      incomes: [{ id: "a", name: "Bono", emoji: null, usd: "", received: false }],
      lines: [],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Escribe cuánto se espera.",
    ]);
  });

  it("descuadrado se guarda igual: es un aviso", () => {
    expect(
      planFormSchema.safeParse({
        incomes: [{ id: "a", name: "Bono", emoji: null, usd: "100,00", received: false }],
        lines: [
          { envelopeId: "savings", usd: "10,00", fundingNote: "", actionNote: "", added: false },
        ],
      }).success,
    ).toBe(true);
  });
});

describe("la fuente de fondos con los ingresos del mes", () => {
  const names = ["Quincena", "Bono", "Tarjeta"];

  it("sabe qué ingresos nombra, sin mayúsculas ni tildes, como Cobrar", () => {
    expect(fundingNames("💰 bono y quincena", names)).toEqual(["Quincena", "Bono"]);
  });

  it("tocar uno lo pone al final, con su emoji, o lo quita", () => {
    expect(toggleFunding("Bono", "Quincena")).toBe("Bono, Quincena");
    expect(toggleFunding("", "Bono", "💰 Bono")).toBe("💰 Bono");
    expect(toggleFunding("Quincena, Bono", "bono")).toBe("Quincena");
  });

  it("avisa de lo que no es ningún ingreso del mes: una abreviatura, un nombre viejo (M14)", () => {
    expect(unknownFunding("🥪 T. Alim, 💰 Bono", names)).toEqual(["🥪 T. Alim"]);
    expect(unknownFunding("💰 Bono y Quincena", names)).toEqual([]);
    expect(unknownFunding("", names)).toEqual([]);
    // Sin ingresos todavía, no hay con qué comparar.
    expect(unknownFunding("Bono", [])).toEqual([]);
  });

  it("renombrar un ingreso lo cambia en la fuente, con lo demás tal cual (M14)", () => {
    expect(renameFunding("💰 Bono, 🪙 20% deuda", "20% Deuda", "20% Ahorro")).toBe(
      "💰 Bono, 🪙 20% Ahorro",
    );
    expect(renameFunding("💵 Quincena", "Bono", "Bono anual")).toBe("💵 Quincena");
    // Un nombre a medio escribir, vacío, no borra nada.
    expect(renameFunding("💰 Bono", "Bono", " ")).toBe("💰 Bono");
  });

  it("al quitar uno, respeta lo demás: abreviaturas, emojis y otros separadores", () => {
    expect(toggleFunding("T. Int, 💰 Bono", "Bono")).toBe("T. Int");
    expect(toggleFunding("💰 Bono y Quincena", "Bono")).toBe("Quincena");
    expect(toggleFunding("Quincena + Pensión", "pension")).toBe("Quincena");
  });
});

it("las acciones no saltan: las de al abrir, en su orden, y las nuevas al final (M14)", () => {
  expect(
    actionChoices(
      ["Cambiar", "Mantener"],
      [{ actionNote: "Mantener" }, { actionNote: "Mantener" }, { actionNote: "Pagar" }],
    ),
  ).toEqual(["Cambiar", "Mantener", "Pagar"]);
});

it("las acciones ya usadas, de la más usada a la menos", () => {
  expect(
    usedActions([
      { actionNote: "Mantener" },
      { actionNote: "Cambiar" },
      { actionNote: " Cambiar " },
      { actionNote: "" },
    ]),
  ).toEqual(["Cambiar", "Mantener"]);
});
