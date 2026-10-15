import { describe, expect, it } from "vitest";
import { isFeeRow, rowRef } from "../src/draft.ts";
import type { DraftOperation } from "../src/draft.ts";
import { groupMonth, titleAmounts } from "../src/group-month.ts";
import { Issues } from "../src/issues.ts";
import type { LedgerRow } from "../src/ledger-sheet.ts";
import { currencyOf, sheetRows } from "./ledger-rows.ts";

const group = (
  rows: LedgerRow[],
  received = { VES: new Set<number>(), USD: new Set<number>() },
) => {
  const issues = new Issues();
  return {
    operations: groupMonth("2026-01", rows, currencyOf, issues, received),
    issues: issues.list,
  };
};
const shape = (operation: DraftOperation) => [
  operation.kind,
  operation.entries.map((entry) => [entry.account, entry.envelope, entry.amountCents, entry.isFee]),
];

describe("los títulos", () => {
  it("un título con las filas que suman lo que dice es un cobro con su reparto", () => {
    const rows = sheetRows("Banco A", [
      ["2026-01-10", "Otro", "Bono $100 = Bs40000", 0],
      ["2026-01-10", "Ahorro", "$60 de Ahorro", 2400000],
      ["2026-01-10", "Comida", "$40 de Comida", 1600000],
      ["2026-01-11", "Comida", "Mercado", -50000],
    ]);
    const { operations } = group(rows);
    expect(operations.map(shape)).toEqual([
      [
        "income",
        [
          ["Banco A", "Ahorro", 2400000, false],
          ["Banco A", "Comida", 1600000, false],
        ],
      ],
      ["expense", [["Banco A", "Comida", -50000, false]]],
    ]);
    expect(operations[0]).toMatchObject({ description: "Bono $100 = Bs40000", date: "2026-01-10" });
    expect(operations[0]!.refs).toHaveLength(3);
  });

  it("si el título no dice los bolívares, valen los que el presupuesto dice que llegaron", () => {
    const rows = sheetRows("Banco A", [
      ["2026-01-10", "Otro", "$100 del bono", 0],
      ["2026-01-10", "Ahorro", "$60 de Ahorro", 2400000],
      ["2026-01-10", "Comida", "$40 de Comida", 1600000],
    ]);
    expect(group(rows).operations).toHaveLength(2);
    const { operations } = group(rows, { VES: new Set([4000000]), USD: new Set() });
    expect(operations.map((operation) => operation.kind)).toEqual(["income"]);
  });

  it("un título que no cuadra describe la fila siguiente y queda anotado", () => {
    const rows = sheetRows("Banco A", [
      ["2026-01-10", "Otro", "Pago del viaje", 0],
      ["2026-01-10", "Ahorro", "Pago del viaje", 300000],
    ]);
    const { operations, issues } = group(rows);
    expect(operations[0]).toMatchObject({ kind: "income", description: "Pago del viaje" });
    expect(issues.map((issue) => issue.code)).toEqual(["TITLE_WITHOUT_CHILDREN"]);
  });

  it("una compra de dólares con su título en las dos cuentas es un cambio de divisa", () => {
    const rows = [
      ...sheetRows("Banco A", [
        ["2026-01-12", "Otro", "Comprar 10 USDT = -Bs4000", 0],
        ["2026-01-12", "Ahorro", "Para Ahorro", -400000],
      ]),
      ...sheetRows("Billetera B", [
        ["2026-01-12", "Otro", "Comprar 10 USDT", 0],
        ["2026-01-12", "Ahorro", "Para Ahorro", 1000],
      ]),
    ];
    expect(group(rows).operations.map(shape)).toEqual([
      [
        "exchange",
        [
          ["Banco A", "Ahorro", -400000, false],
          ["Billetera B", "Ahorro", 1000, false],
        ],
      ],
    ]);
  });

  it("lee la cifra de la moneda de la hoja e ignora la de la otra", () => {
    expect([...titleAmounts("Bono $1000 = Bs400000", "VES").exact]).toEqual([40000000]);
    expect([...titleAmounts("Bono $1000 = Bs400000", "USD").exact]).toEqual([100000]);
    expect([...titleAmounts("Comprar 10 USDT", "USD").exact]).toEqual([1000]);
  });
});

describe("los pares", () => {
  it("dos filas seguidas que se anulan son un préstamo entre sobres", () => {
    const rows = sheetRows("Banco A", [
      ["2026-01-05", "Salidas", "Salidas le presta a Comida", -5000],
      ["2026-01-05", "Comida", "Salidas le presta a Comida", 5000],
    ]);
    expect(group(rows).operations.map(shape)).toEqual([
      [
        "envelope_transfer",
        [
          ["Banco A", "Salidas", -5000, false],
          ["Banco A", "Comida", 5000, false],
        ],
      ],
    ]);
  });

  it("el mismo importe en dos bancos de la misma moneda es un traspaso, aunque lleguen otro día", () => {
    const rows = [
      ...sheetRows("Banco A", [["2026-01-05", "Comida", "Enviar a Banco C", -10000]]),
      ...sheetRows("Banco C", [["2026-01-06", "Comida", "Desde Banco A", 10000]]),
    ];
    expect(group(rows).operations.map(shape)).toEqual([
      [
        "account_transfer",
        [
          ["Banco A", "Comida", -10000, false],
          ["Banco C", "Comida", 10000, false],
        ],
      ],
    ]);
  });

  it("ante la duda no se junta: si hay dos parejas posibles, cada fila queda sola", () => {
    const rows = [
      ...sheetRows("Banco A", [
        ["2026-01-05", "Comida", "Pago", -10000],
        ["2026-01-05", "Ahorro", "Otro pago", -10000],
      ]),
      ...sheetRows("Banco C", [["2026-01-05", "Comida", "Cobro", 10000]]),
    ];
    expect(group(rows).operations.map((operation) => operation.kind)).toEqual([
      "expense",
      "expense",
      "income",
    ]);
  });
});

describe("las comisiones (R16)", () => {
  it("se reconocen por el concepto, también con erratas, y solo si salen", () => {
    const fee = (description: string, cents = -300) =>
      isFeeRow(sheetRows("Banco A", [["2026-01-05", "Comida", description, cents]])[0]!);
    expect(fee("Comsión pago móviil")).toBe(true);
    expect(fee("Envio de SMS")).toBe(true);
    expect(fee("Mantenimiento de cuenta")).toBe(true);
    expect(fee("Mantenimiento de la moto")).toBe(false);
    expect(fee("Devolución comisión pago móvil", 300)).toBe(false);
  });

  it("van con el movimiento de justo antes, en su propio sobre", () => {
    const rows = sheetRows("Banco A", [
      ["2026-01-05", "Comida", "Pago del mercado", -100000],
      ["2026-01-05", "Ahorro", "Comisión pago móvil", -300],
    ]);
    expect(group(rows).operations.map(shape)).toEqual([
      [
        "expense",
        [
          ["Banco A", "Comida", -100000, false],
          ["Banco A", "Ahorro", -300, true],
        ],
      ],
    ]);
  });

  it("una comisión sola es un gasto", () => {
    const rows = sheetRows("Banco A", [["2026-01-31", "Ahorro", "Mantenimiento de cuenta", -1000]]);
    expect(group(rows).operations.map(shape)).toEqual([
      ["expense", [["Banco A", "Ahorro", -1000, true]]],
    ]);
  });
});

it("cada fila con importe acaba en una sola operación, y el arrastre en ninguna", () => {
  const rows = [
    ...sheetRows("Banco A", [
      ["2026-01-01", "Ahorro", "Lo que tenía antes", 500000],
      ["2026-01-10", "Otro", "Bono $100 = Bs40000", 0],
      ["2026-01-10", "Ahorro", "$60 de Ahorro", 2400000],
      ["2026-01-10", "Ahorro", "Comisión pago móvil", -300],
      ["2026-01-10", "Comida", "$40 de Comida", 1600000],
      ["2026-01-11", "Comida", "Comida le presta a Ahorro", -2000],
      ["2026-01-11", "Ahorro", "Comida le presta a Ahorro", 2000],
      ["2026-01-12", "Comida", "Enviar a Banco C", -7000],
    ]),
    ...sheetRows("Banco C", [["2026-01-12", "Comida", "Desde Banco A", 7000]]),
  ];
  const refs = group(rows).operations.flatMap((operation) => operation.refs);
  const withAmount = rows
    .filter((row) => row.amountCents !== 0 && !row.isCarry)
    .map((row) => rowRef("2026-01", row));
  expect(new Set(refs).size).toBe(refs.length);
  expect(withAmount.every((ref) => refs.includes(ref))).toBe(true);
  expect(refs).not.toContain(rowRef("2026-01", rows[0]!));
});
