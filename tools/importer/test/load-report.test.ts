import { describe, expect, it } from "vitest";
import type { BudgetSheet } from "../src/budget-sheet.ts";
import { buildPackage } from "../src/build-package.ts";
import { buildCatalog } from "../src/catalog.ts";
import { planRows } from "../src/load.ts";
import type { MonthData } from "../src/read-workbook.ts";
import { buildReport } from "../src/report.ts";
import { sheetRows } from "./ledger-rows.ts";

// Un mes inventado, ya leído: una cuenta que abre, un cobro y un gasto.
const catalog = buildCatalog({
  accounts: [{ name: "Banco A", currency: "VES", sheets: ["BANCO A"] }],
  envelopes: [
    { name: "Ahorro", aliases: ["Ahorro"] },
    { name: "Comida", aliases: ["Comida"] },
    { name: "Otro", third_party: true, aliases: ["Otro"] },
  ],
  incomes: [{ name: "Bono", emoji: "💰", aliases: ["💰 Bono"] }],
});

const budget: BudgetSheet = {
  incomes: [
    {
      row: 4,
      sourceText: "💰 Bono",
      source: "Bono",
      usdCents: 100,
      localCents: 40000,
      date: "2026-01-10",
      checked: true,
    },
  ],
  lines: [
    {
      row: 10,
      envelopeText: "Ahorro",
      envelope: "Ahorro",
      plannedUsdCents: 60,
      localCents: null,
      remainingVesCents: null,
      remainingUsdCents: null,
      fundingNote: "Bono",
      actionNote: "",
      checked: true,
    },
  ],
  accountBalances: [],
  totals: {
    vesCents: null,
    vesWithThirdPartyCents: null,
    usdCents: null,
    usdWithThirdPartyCents: null,
  },
  debts: [
    {
      row: 20,
      direction: "payable",
      description: "Cuota de la tienda",
      amountCents: 2000,
      currency: "USD",
      amountText: null,
      dueOn: "2026-02-15",
      paid: null,
    },
  ],
};

const month: MonthData = {
  month: "2026-01",
  file: "Finanzas Enero 2026.xlsx",
  issues: [],
  budget,
  ledger: sheetRows("Banco A", [
    ["2026-01-01", "Ahorro", "Lo que tenía antes", 50000],
    ["2026-01-10", "Otro", "Bono $1 = Bs400", 0],
    ["2026-01-10", "Ahorro", "$0,60 de Ahorro", 24000],
    ["2026-01-10", "Comida", "$0,40 de Comida", 16000],
    ["2026-01-12", "Comida", "Mercado", -5000],
  ]),
};

const pkg = buildPackage([month], catalog);

describe("las filas que se escriben en la base", () => {
  const { rows } = planRows(pkg, catalog);
  const ids = (table: Record<string, unknown>[]) => new Set(table.map((row) => row.id));

  it("cada asiento apunta a una operación, una cuenta y un sobre que se escriben con él", () => {
    expect(rows.entries).toHaveLength(4);
    for (const entry of rows.entries) {
      expect(ids(rows.operations).has(entry.operation_id)).toBe(true);
      expect(ids(rows.accounts).has(entry.account_id)).toBe(true);
      expect(ids(rows.envelopes).has(entry.envelope_id)).toBe(true);
    }
  });

  it("el cobro queda enlazado a su ingreso esperado, con el reparto en dólares", () => {
    const [income] = rows.expected_incomes;
    const receipt = rows.operations.find((operation) => operation.income_id === income!.id);
    expect(receipt).toMatchObject({
      kind: "income",
      occurred_on: "2026-01-10",
      description: "Bono $1 = Bs400",
    });
    const lines = rows.entries.filter((entry) => entry.operation_id === receipt!.id);
    expect(lines.map((line) => line.usd_value_cents)).toEqual([60, 40]);
  });

  it("el ingreso esperado lleva el emoji del catálogo", () => {
    expect(rows.expected_incomes[0]).toMatchObject({ name: "Bono", emoji: "💰" });
  });

  it("el arrastre del primer mes es un ajuste de apertura", () => {
    expect(rows.operations.filter((operation) => operation.kind === "adjustment")).toEqual([
      expect.objectContaining({ adjustment_reason: "opening", occurred_on: "2026-01-01" }),
    ]);
  });

  it("el plan y las deudas van con su mes y su sobre", () => {
    expect(rows.budget_lines).toEqual([
      expect.objectContaining({
        month_start: "2026-01-01",
        planned_usd_cents: 60,
        funding_note: "Bono",
      }),
    ]);
    expect(rows.debts).toEqual([
      expect.objectContaining({ description: "Cuota de la tienda", currency: "USD" }),
    ]);
  });
});

describe("el informe", () => {
  const counts = {
    accounts: 1,
    envelopes: 3,
    expected_incomes: 1,
    operations: 3,
    entries: 4,
    budget_lines: 1,
    debts: 1,
  };
  const oracle = { checks: 5, differences: [], budgetNotes: [], planningMonths: [] };
  const report = buildReport(pkg, [month], { status: "ok", dryRun: true, counts, oracle });

  it("dice qué aceptó la base y que en seco no quedó nada escrito", () => {
    expect(report).toContain("aceptó las 3 operaciones y sus 4 asientos");
    expect(report).toContain("Era en seco: no quedó nada escrito.");
  });

  it("lista el arrastre, los cobros y las deudas con sus importes", () => {
    expect(report).toContain(
      "| 2026-01 | 2026-01-01 | Banco A | Saldo inicial | Ahorro Bs 500,00 |",
    );
    expect(report).toContain("| 2026-01 | Bono | $ 1,00 | 2026-01-10, Bs 400,00 |  |");
    expect(report).toContain("| Debemos | Cuota de la tienda | $ 20,00 | 2026-02-15 |");
  });

  it("dice si los saldos coinciden con el Excel", () => {
    expect(report).toContain("los 5 saldos comparados coinciden al céntimo.");
  });

  it("lista cada saldo que no coincide con el Excel y lo que el presupuesto calcula distinto", () => {
    const withDifferences = buildReport(pkg, [month], {
      status: "ok",
      dryRun: true,
      counts,
      oracle: {
        checks: 5,
        differences: [
          {
            month: "2026-01",
            what: "Cuenta Banco A",
            currency: "VES",
            excelCents: 40000,
            appCents: 39999,
          },
        ],
        budgetNotes: [
          { month: "2026-01", message: "Plan de Ahorro: el Excel dice ✅ y la app, ⏳" },
        ],
        planningMonths: ["2026-02"],
      },
    });
    expect(withDifferences).toContain("**1 de 5 saldos no coinciden** (sección 2).");
    expect(withDifferences).toContain(
      "| 2026-01 | Cuenta Banco A | Bs 400,00 | Bs 399,99 | -Bs 0,01 |",
    );
    expect(withDifferences).toContain("- 2026-01: Plan de Ahorro: el Excel dice ✅ y la app, ⏳");
    expect(withDifferences).toContain("aún no empieza): 2026-02.");
  });

  it("si la base rechaza la carga, dice qué operación y de qué filas", () => {
    const operation = pkg.operations.find((candidate) => candidate.kind === "expense")!;
    const rejected = buildReport(pkg, [month], {
      status: "rejected",
      message: "Un gasto sale de una sola cuenta",
      operation,
    });
    expect(rejected).toContain(
      "**rechazó la carga**: Un gasto sale de una sola cuenta (2026-01, «Mercado», filas 2026-01:BANCO A:8)",
    );
  });
});
