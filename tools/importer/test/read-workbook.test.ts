import { describe, expect, it } from "vitest";
import { buildCatalog } from "../src/catalog.ts";
import type { CatalogInput } from "../src/catalog.ts";
import { isPlanningOnly, monthFromFileName, readWorkbook } from "../src/read-workbook.ts";
import { bs, buildSheet, date, ledgerSheet, usd, writeWorkbook } from "./workbook-builder.ts";

// Un mes inventado con las rarezas de los de verdad. Todo lo de aquí es ficticio.
const catalogInput: CatalogInput = {
  accounts: [
    { name: "Banco A", currency: "VES", sheets: ["BANCO A"] },
    { name: "Billetera B", currency: "USD", sheets: ["BILLETERA B"] },
  ],
  envelopes: [
    { name: "Ahorro", aliases: ["🏦 Ahorro"] },
    { name: "Comida", aliases: ["🍱 Comida"] },
    { name: "Transporte", aliases: ["🚌 Transporte"] },
    { name: "Otro", third_party: true, aliases: ["Otro"] },
  ],
  incomes: [
    { name: "Bono", aliases: ["💰 Bono"] },
    { name: "Quincena", aliases: ["💵 Quincena"] },
  ],
};

const bankA = ledgerSheet("Banco A", [
  [date("2026-01-01"), "🏦 Ahorro", "Lo que tenía antes", bs(1000), 1000],
  [date("2026-01-01"), "🍱 Comida", "Lo que tenía antes", bs(500), 1500],
  [date("2026-01-10"), "Otro", "Bono $100 = Bs40000", bs(0), 1500],
  [date("2026-01-10"), "🏦 Ahorro", "$60 de Ahorro", bs(24000), 25500],
  [date("2026-01-10"), "🍱 Comida", "$40 de Comida", bs(16000), 41500],
  [null, "🍱 Comida", "Mercado", bs(-1234.565, "-1000-234.565"), 40265.44],
  ["???", "🍱 Comida", "", bs(-100), 40165.44],
  [null, null, null, null, 40165.44],
  [date("2026-01-20"), "🚌 Transporte", "Pasaje", bs(-50.1), 40115.34],
]);

const walletB = ledgerSheet("Billetera B", [
  [date("2026-01-01"), "Otro", "Lo que tenía antes", usd(100), 100],
  [date("2026-01-28"), "🏦 Ahorro", "Compra", usd(25.5), 125.5],
]);

const budget = buildSheet({
  // Un bloque con el mismo título que el de las deudas, pero con otra cosa: se ignora.
  2: [
    "🧾 Ingresos esperados",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    "Deudas",
  ],
  3: [
    "Fuente",
    "$",
    "Bs",
    "Fecha",
    "Tasa",
    "👁️",
    null,
    null,
    null,
    null,
    null,
    null,
    "Pintura",
    usd(10),
  ],
  4: ["💰 Bono", 100, 40000, date("2026-01-10"), 400, "✅"],
  5: ["💵 Quincena", 10, null, null, 0, "⏳"],
  6: ["Total recibido", 100],
  8: ["📦 Distribución de los ingresos"],
  9: [
    "Categoría",
    "$",
    "Bs",
    "Restante Bs",
    "Restante $",
    "Restante diversificado",
    "Fuente de Fondos",
    "Acción",
    "👁️",
  ],
  10: [
    "🏦 Ahorro",
    60,
    24000,
    25000,
    25.5,
    "• Banco A: Bs 25000",
    "💰 Bono",
    "Cambiar a USDT",
    "✅",
  ],
  11: ["🍱 Comida", 40, 16000, 15165.44, 0, null, "💰 Bono", "Mantener en bolívares", "✅"],
  12: ["🚌 Transporte", 10, 0, -50.1, 0, null, "💵 Quincena", null, "⏳"],
  13: ["Otro", "-", "-", 0, 100],
  14: ["Total pagado", 100],
  16: ["💹 Restante en las cuentas", null, null, "📉 Deudas"],
  17: ["Nombre", "Restante", null, "Fecha límite", "Concepto", "Cantidad", "👁️"],
  18: ["BANCO A", 40115.34, null, date("2026-02-15"), "Cuota de la tienda", usd(20), "⏳"],
  19: ["BILLETERA B", 125.5, null, null, "Tarjeta", usd(30), "✅"],
  20: ["Total Bs", 40115.34, null, null, "Total", usd(50)],
  21: ["Total Bs con 'Otro'", 40115.34],
  22: ["Total $", 25.5],
  23: ["Total $ con 'Otro'", 125.5],
  25: ["🔫 Deudores"],
  26: ["Deudor", "Cantidad"],
  27: ["Un amigo", "20 USDT"],
  28: ["Una vecina", bs(5000)],
});

const file = "Finanzas Enero 2026.xlsx";
const excel = writeWorkbook({ PRESUPUESTO: budget, "BANCO A": bankA, "BILLETERA B": walletB });

describe("un libro mensual", () => {
  const data = readWorkbook(excel, file, buildCatalog(catalogInput));
  const errors = data.issues.filter((issue) => issue.level === "error");

  it("dice de qué mes es por el nombre del archivo", () => {
    expect(data.month).toBe("2026-01");
    expect(monthFromFileName("Finanzas Septiembre 2026.xlsx")).toBe("2026-09");
    expect(monthFromFileName("copia.xlsx")).toBeNull();
  });

  it("un libro con movimientos no es solo planificación; uno con la plantilla a cero, sí", () => {
    expect(isPlanningOnly(data)).toBe(false);
    const template = data.ledger
      .slice(0, 1)
      .map((row) => ({ ...row, isCarry: true, amountCents: 0 }));
    expect(isPlanningOnly({ ...data, ledger: template })).toBe(true);
  });

  it("no encuentra errores", () => {
    expect(errors).toEqual([]);
  });

  it("lee cada fila con su cuenta, su sobre y su importe en céntimos", () => {
    const rows = data.ledger.filter((row) => row.account === "Banco A");
    expect(rows.map((row) => [row.row, row.date, row.envelope, row.amountCents])).toEqual([
      [4, "2026-01-01", "Ahorro", 100000],
      [5, "2026-01-01", "Comida", 50000],
      [6, "2026-01-10", "Otro", 0],
      [7, "2026-01-10", "Ahorro", 2400000],
      [8, "2026-01-10", "Comida", 1600000],
      [9, "2026-01-10", "Comida", -123457],
      [10, "2026-01-10", "Comida", -10000],
      [12, "2026-01-20", "Transporte", -5010],
    ]);
  });

  it("marca el arrastre del mes anterior", () => {
    expect(data.ledger.filter((row) => row.isCarry).map((row) => [row.account, row.row])).toEqual([
      ["Banco A", 4],
      ["Banco A", 5],
      ["Billetera B", 4],
    ]);
  });

  it("R15: una fila sin fecha toma la de la anterior y queda marcada", () => {
    const [noDate, unreadable] = data.ledger.filter((row) => row.dateApproximate);
    expect(noDate).toMatchObject({ row: 9, date: "2026-01-10", dateText: null });
    expect(unreadable).toMatchObject({ row: 10, date: "2026-01-10", dateText: "???" });
    expect(data.issues.filter((issue) => issue.code === "DATE_APPROXIMATE")).toHaveLength(2);
  });

  it("guarda la fórmula de un importe y el restante del Excel para compararlo después", () => {
    const row = data.ledger.find((candidate) => candidate.row === 9);
    expect(row?.amountFormula).toBe("-1000-234.565");
    expect(row?.balanceCents).toBe(4026544);
  });

  it("salta las filas que solo tienen el restante", () => {
    expect(data.ledger.some((row) => row.account === "Banco A" && row.row === 11)).toBe(false);
  });

  it("lee los ingresos esperados hasta su fila de totales", () => {
    expect(data.budget?.incomes).toEqual([
      {
        row: 4,
        sourceText: "💰 Bono",
        source: "Bono",
        usdCents: 10000,
        localCents: 4000000,
        date: "2026-01-10",
        checked: true,
      },
      {
        row: 5,
        sourceText: "💵 Quincena",
        source: "Quincena",
        usdCents: 1000,
        localCents: null,
        date: null,
        checked: false,
      },
    ]);
  });

  it("lee el plan de cada sobre, con «Otro» sin plan", () => {
    const lines = data.budget?.lines ?? [];
    expect(
      lines.map((line) => [
        line.envelope,
        line.plannedUsdCents,
        line.remainingVesCents,
        line.checked,
      ]),
    ).toEqual([
      ["Ahorro", 6000, 2500000, true],
      ["Comida", 4000, 1516544, true],
      ["Transporte", 1000, -5010, false],
      ["Otro", null, 0, null],
    ]);
    expect(lines[0]).toMatchObject({ fundingNote: "💰 Bono", actionNote: "Cambiar a USDT" });
  });

  it("lee lo que el Excel dice de cada cuenta y los totales con y sin «Otro»", () => {
    expect(data.budget?.accountBalances.map((row) => [row.account, row.balanceCents])).toEqual([
      ["Banco A", 4011534],
      ["Billetera B", 12550],
    ]);
    expect(data.budget?.totals).toEqual({
      vesCents: 4011534,
      vesWithThirdPartyCents: 4011534,
      usdCents: 2550,
      usdWithThirdPartyCents: 12550,
    });
  });

  it("lee las deudas y los deudores, con la moneda del formato o del texto y si ya se pagaron", () => {
    expect(
      data.budget?.debts.map((debt) => [
        debt.direction,
        debt.description,
        debt.amountCents,
        debt.currency,
        debt.dueOn,
        debt.paid,
      ]),
    ).toEqual([
      ["payable", "Cuota de la tienda", 2000, "USD", "2026-02-15", false],
      ["payable", "Tarjeta", 3000, "USD", null, true],
      ["receivable", "Un amigo", 2000, "USD", null, null],
      ["receivable", "Una vecina", 500000, "VES", null, null],
    ]);
  });
});

describe("lo que impide importar un mes", () => {
  const codes = (
    input: CatalogInput,
    sheets = { PRESUPUESTO: budget, "BANCO A": bankA, "BILLETERA B": walletB },
  ) =>
    readWorkbook(writeWorkbook(sheets), file, buildCatalog(input))
      .issues.filter((issue) => issue.level === "error")
      .map((issue) => issue.code);

  it("un sobre que no está en el catálogo", () => {
    const envelopes = catalogInput.envelopes.filter((envelope) => envelope.name !== "Transporte");
    expect(codes({ ...catalogInput, envelopes })).toEqual(["UNKNOWN_ENVELOPE", "UNKNOWN_ENVELOPE"]);
  });

  it("una hoja que no es ninguna cuenta", () => {
    const accounts = catalogInput.accounts.filter((account) => account.name !== "Billetera B");
    expect(codes({ ...catalogInput, accounts })).toEqual(["UNKNOWN_SHEET"]);
  });

  it("una cuenta con la moneda equivocada", () => {
    const accounts = catalogInput.accounts.map((account) =>
      account.name === "Billetera B" ? { ...account, currency: "VES" as const } : account,
    );
    expect(codes({ ...catalogInput, accounts })).toEqual(["CURRENCY_MISMATCH"]);
  });

  it("dos textos del mismo mes juntados en un solo sobre", () => {
    const envelopes = catalogInput.envelopes
      .filter((envelope) => envelope.name !== "Transporte")
      .map((envelope) =>
        envelope.name === "Comida"
          ? { ...envelope, aliases: ["🍱 Comida", "🚌 Transporte"] }
          : envelope,
      );
    expect(codes({ ...catalogInput, envelopes })).toEqual(["ALIASES_COEXIST"]);
  });

  it("una hoja de cuenta sin su cabecera", () => {
    const broken = buildSheet({
      2: ["Banco A"],
      4: [date("2026-01-01"), "🏦 Ahorro", "Algo", bs(1)],
    });
    expect(
      codes(catalogInput, { PRESUPUESTO: budget, "BANCO A": broken, "BILLETERA B": walletB }),
    ).toEqual(["NO_HEADER"]);
  });
});
