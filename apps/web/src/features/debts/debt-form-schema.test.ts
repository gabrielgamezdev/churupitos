import { describe, expect, it } from "vitest";

import {
  debtFormSchema,
  debtFormValues,
  debtRows,
  emptyDebtForm,
  installmentDates,
} from "./debt-form-schema";

const ids = ["a", "b", "c", "d"];

describe("las cuotas de una deuda", () => {
  it("cada 14 días desde la primera, también entre meses", () => {
    expect(installmentDates("2026-10-25", 3, "14d")).toEqual([
      "2026-10-25",
      "2026-11-08",
      "2026-11-22",
    ]);
  });

  it("cada mes, y un mes sin ese día se queda en su último", () => {
    expect(installmentDates("2026-01-31", 3, "month")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("una por cuota, con su fecha y el monto de cada una", () => {
    const rows = debtRows(
      {
        ...emptyDebtForm(),
        description: " Cuota de la tienda ",
        amount: "20",
        dueOn: "2026-11-04",
        inInstallments: true,
        count: "3",
      },
      ids,
    );
    expect(rows.map((row) => [row.id, row.description, row.amount_cents, row.due_on])).toEqual([
      ["a", "Cuota de la tienda", 2000, "2026-11-04"],
      ["b", "Cuota de la tienda", 2000, "2026-11-18"],
      ["c", "Cuota de la tienda", 2000, "2026-12-02"],
    ]);
  });

  it("sin cuotas, una sola deuda, con fecha o sin ella", () => {
    const rows = debtRows(
      { ...emptyDebtForm("receivable"), description: "Un amigo", amount: "50" },
      ids,
    );
    expect(rows).toEqual([
      {
        id: "a",
        direction: "receivable",
        description: "Un amigo",
        amount_cents: 5000,
        currency: "USD",
        due_on: null,
      },
    ]);
  });
});

describe("el formulario de una deuda", () => {
  it("pide el concepto y el monto, y en cuotas, cuántas y la primera fecha", () => {
    const result = debtFormSchema.safeParse({
      ...emptyDebtForm(),
      inInstallments: true,
      count: "30",
    });
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Escribe el concepto.",
      "Escribe el monto.",
      "Entre 2 y 24 cuotas.",
      "La primera cuota necesita su fecha.",
    ]);
  });

  it("vuelve a enseñar una guardada como se tecleó", () => {
    expect(
      debtFormValues({
        id: "a",
        direction: "payable",
        description: "Tarjeta",
        amountCents: 3005,
        currency: "VES",
        dueOn: null,
        paidOn: null,
        position: 1,
      }),
    ).toMatchObject({ description: "Tarjeta", amount: "30,05", currency: "VES", dueOn: "" });
  });
});
