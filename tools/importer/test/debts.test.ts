import { describe, expect, it } from "vitest";

import type { DebtRow } from "../src/budget-sheet.ts";
import { currentDebts } from "../src/debts.ts";

let row = 0;
function debt(description: string, dueOn: string | null, paid: boolean | null): DebtRow {
  return {
    row: ++row,
    direction: "payable",
    description,
    amountCents: 2000,
    currency: "USD",
    amountText: null,
    dueOn,
    paid,
  };
}

const descriptions = (result: ReturnType<typeof currentDebts>) =>
  result.debts.map((d) => d.description);

describe("D9: la lista vigente de deudas", () => {
  it("con ✅/⏳: lo pendiente del último libro y las cuotas del anterior que siguen en ⏳", () => {
    const result = currentDebts([
      {
        month: "2026-10",
        debts: [
          debt("Préstamo de Comida a Ahorro", null, false),
          debt("Cuota de la tienda", "2026-10-04", true),
          debt("Cuota del teléfono", "2026-10-28", false),
          debt("Tarjeta", "2026-11-05", false),
        ],
      },
      {
        // La planificación del mes siguiente, hecha antes de tiempo.
        month: "2026-11",
        debts: [
          debt("Tarjeta", "2026-11-05", false),
          debt("Cuota de la tienda", "2026-11-04", false),
          debt("Cuota del libro", "2026-11-10", true),
        ],
      },
    ]);
    expect(descriptions(result)).toEqual(["Cuota del teléfono", "Tarjeta", "Cuota de la tienda"]);
    expect(result.debts.map((d) => d.position)).toEqual([1, 2, 3]);
  });

  it("una deuda sin fecha que no pasó al último libro se dejó de pagar: no entra, con aviso", () => {
    const result = currentDebts([
      { month: "2026-10", debts: [debt("Préstamo de Comida a Ahorro", null, false)] },
      { month: "2026-11", debts: [] },
    ]);
    expect(result.debts).toEqual([]);
    expect(result.issues).toMatchObject([{ code: "DEBT_DROPPED", month: "2026-10" }]);
  });

  it("sin ✅/⏳ (antes de octubre de 2026), solo cuenta la lista del último libro", () => {
    const result = currentDebts([
      { month: "2026-08", debts: [debt("Cuota vieja", "2026-08-10", null)] },
      { month: "2026-09", debts: [debt("Cuota de la tienda", "2026-09-04", null)] },
    ]);
    expect(descriptions(result)).toEqual(["Cuota de la tienda"]);
  });
});
