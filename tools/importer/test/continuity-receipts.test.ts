import { describe, expect, it } from "vitest";
import type { ExpectedIncomeRow } from "../src/budget-sheet.ts";
import { CellBalances, carryAdjustments } from "../src/continuity.ts";
import { groupMonth } from "../src/group-month.ts";
import { Issues } from "../src/issues.ts";
import { linkReceipts } from "../src/receipts.ts";
import { currencyOf, sheetRows } from "./ledger-rows.ts";

describe("el arrastre (R7)", () => {
  const january = [
    ...sheetRows("Banco A", [
      ["2026-01-01", "Ahorro", "Lo que tenía antes", 100000],
      ["2026-01-01", "Comida", "Lo que tenía antes", 50000],
      ["2026-01-15", "Comida", "Mercado", -20000],
    ]),
    ...sheetRows("Billetera B", [["2026-01-01", "Otro", "Lo que tenía antes", 1000]]),
  ];

  // Enero entero: sus ajustes y sus movimientos, como hace el importador.
  function afterJanuary() {
    const balances = new CellBalances();
    const issues = new Issues();
    const opening = carryAdjustments("2026-01", january, balances, issues);
    groupMonth("2026-01", january, currencyOf, issues).forEach((operation) =>
      balances.apply(operation),
    );
    return { balances, opening };
  }
  const februaryWith = (carry: [string, number][], issues = new Issues()) =>
    carryAdjustments(
      "2026-02",
      sheetRows(
        "Banco A",
        carry.map(([envelope, cents]) => ["2026-02-01", envelope, "Lo que tenía antes", cents]),
      ),
      afterJanuary().balances,
      issues,
    );

  it("en el primer mes, cada cuenta abre con sus saldos iniciales", () => {
    expect(
      afterJanuary().opening.map((operation) => [
        operation.adjustmentReason,
        operation.date,
        operation.entries.map((entry) => [entry.account, entry.envelope, entry.amountCents]),
      ]),
    ).toEqual([
      [
        "opening",
        "2026-01-01",
        [
          ["Banco A", "Ahorro", 100000],
          ["Banco A", "Comida", 50000],
        ],
      ],
      ["opening", "2026-01-01", [["Billetera B", "Otro", 1000]]],
    ]);
  });

  it("si el arrastre coincide con el cierre anterior, no se registra nada", () => {
    expect(
      februaryWith([
        ["Ahorro", 100000],
        ["Comida", 30000],
      ]),
    ).toEqual([]);
  });

  it("un cambio de sobre al copiar el arrastre es un ajuste con fecha del día 1", () => {
    // Comida no aparece: está declarada a cero, y su dinero pasó a Ahorro.
    const [adjustment] = februaryWith([["Ahorro", 130000]]);
    expect(adjustment).toMatchObject({
      adjustmentReason: "carry_reassignment",
      date: "2026-02-01",
    });
    expect(adjustment!.entries.map((entry) => [entry.envelope, entry.amountCents])).toEqual([
      ["Ahorro", 30000],
      ["Comida", -30000],
    ]);
  });

  it("unos céntimos de diferencia son redondeo: se corrigen el último día del mes anterior", () => {
    const [adjustment] = februaryWith([
      ["Ahorro", 100001],
      ["Comida", 30000],
    ]);
    expect(adjustment).toMatchObject({ adjustmentReason: "correction", date: "2026-01-31" });
  });

  it("dinero que aparece en el arrastre sin venir de ningún sitio se registra y se anota", () => {
    const issues = new Issues();
    const [adjustment] = februaryWith(
      [
        ["Ahorro", 150000],
        ["Comida", 30000],
      ],
      issues,
    );
    expect(adjustment?.adjustmentReason).toBe("carry_reassignment");
    expect(issues.list.map((issue) => issue.code)).toEqual(["CARRY_UNEXPLAINED"]);
  });
});

describe("los cobros", () => {
  const income = (
    row: number,
    usdCents: number,
    localCents: number | null,
    date: string | null,
    checked = true,
  ): ExpectedIncomeRow => ({
    row,
    sourceText: `Ingreso ${row}`,
    source: `Ingreso ${row}`,
    usdCents,
    localCents,
    date,
    checked,
  });
  const link = (incomes: ExpectedIncomeRow[], rows = cobro, earlier = []) => {
    const issues = new Issues();
    const operations = groupMonth("2026-01", rows, currencyOf, issues);
    const drafts = linkReceipts("2026-01", incomes, operations, earlier, currencyOf, issues);
    return { operations, drafts, issues: issues.list };
  };
  const cobro = sheetRows("Banco A", [
    ["2026-01-10", "Otro", "Bono $100 = Bs40000", 0],
    ["2026-01-10", "Ahorro", "$60 de Ahorro", 2400000],
    ["2026-01-10", "Comida", "$40 de Comida", 1600000],
  ]);

  it("cada ingreso esperado se enlaza con la operación que suma lo que llegó", () => {
    const { operations, drafts } = link([income(4, 10000, 4000000, "2026-01-10")]);
    expect(drafts).toEqual([
      { key: "2026-01#1", month: "2026-01", name: "Ingreso 4", usdCents: 10000, position: 1 },
    ]);
    expect(operations[0]!.incomeKey).toBe("2026-01#1");
  });

  it("R9: el valor en dólares de cada línea es el que dice su concepto", () => {
    const { operations } = link([income(4, 10000, 4000000, "2026-01-10")]);
    expect(operations[0]!.entries.map((entry) => entry.usdValueCents)).toEqual([6000, 4000]);
  });

  it("R9: si el concepto no lo dice, se reparte en proporción y la última línea absorbe el céntimo", () => {
    const rows = sheetRows("Banco A", [
      ["2026-01-10", "Ahorro", "Cobro", 3000000],
      ["2026-01-10", "Comida", "Cobro", 1000001],
    ]);
    // Un título que las junta en un cobro, y conceptos sin «$N de…».
    const titled = [
      ...sheetRows("Banco A", [["2026-01-10", "Otro", "Bono = Bs40000,01", 0]], 3),
      ...rows,
    ];
    const { operations } = link([income(4, 10000, 4000001, "2026-01-10")], titled);
    expect(operations[0]!.entries.map((entry) => entry.usdValueCents)).toEqual([7500, 2500]);
  });

  it("un ingreso ✅ sin cobro que lo cuadre queda anotado", () => {
    const { issues } = link([income(4, 10000, 5000000, "2026-01-10")]);
    expect(issues.map((issue) => issue.code)).toEqual(["RECEIPT_NOT_FOUND"]);
  });

  it("un cobro que paga dos ingresos a la vez se parte en dos", () => {
    const rows = sheetRows("Banco A", [
      ["2026-01-21", "Otro", "Abono = Bs7000", 0],
      ["2026-01-21", "Ahorro", "$20 del primero", 200000],
      ["2026-01-21", "Ahorro", "$30 del segundo", 300000],
      ["2026-01-21", "Comida", "$20 del segundo", 200000],
    ]);
    const { operations } = link(
      [income(4, 2000, 200000, "2026-01-21"), income(5, 5000, 500000, "2026-01-21")],
      rows,
    );
    expect(
      operations.map((operation) => [
        operation.incomeKey,
        operation.entries.map((entry) => entry.amountCents),
      ]),
    ).toEqual([
      ["2026-01#1", [200000]],
      ["2026-01#2", [300000, 200000]],
    ]);
  });
});
