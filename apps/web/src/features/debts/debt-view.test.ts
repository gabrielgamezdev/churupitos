import { describe, expect, it } from "vitest";

import { daysBetween, dueLabel, summarizeDebts } from "./debt-view";
import type { Debt } from "./queries";

let position = 0;
const debt = (
  description: string,
  dueOn: string | null,
  amountCents: number,
  extra: Partial<Debt> = {},
): Debt => ({
  id: description,
  direction: "payable",
  description,
  amountCents,
  currency: "USD",
  dueOn,
  paidOn: null,
  position: ++position,
  ...extra,
});

describe("lo que deben", () => {
  it("se agrupa por mes de vencimiento, con lo que suma cada uno y las sin fecha al final", () => {
    const { groups } = summarizeDebts(
      [
        debt("Cuota de la tienda", "2026-11-04", 2000),
        debt("Tarjeta", "2026-11-20", 3000),
        debt("Cuota del libro", "2026-12-05", 1000, { currency: "VES" }),
        debt("Préstamo de Comida a Ahorro", null, 500),
      ],
      "payable",
      "2026-10",
    );
    expect(groups.map((g) => [g.label, g.totals, g.debts.length])).toEqual([
      ["Noviembre 2026", { USD: 5000 }, 2],
      ["Diciembre 2026", { VES: 1000 }, 1],
      ["Sin fecha", { USD: 500 }, 1],
    ]);
  });

  it("las pagadas van aparte, solo las del mes, y lo que les deben no entra", () => {
    const { groups, paid } = summarizeDebts(
      [
        debt("Cuota de septiembre", "2026-09-04", 2000, { paidOn: "2026-09-04" }),
        debt("Cuota de octubre", "2026-10-04", 2000, { paidOn: "2026-10-03" }),
        debt("Tarjeta", "2026-11-20", 3000),
        debt("Un amigo", null, 500, { direction: "receivable" }),
      ],
      "payable",
      "2026-10",
    );
    expect(groups.map((g) => g.label)).toEqual(["Noviembre 2026"]);
    expect(paid.map((d) => d.description)).toEqual(["Cuota de octubre"]);
  });

  it("lo que les deben, también con lo pendiente y lo pagado aparte", () => {
    const { pending, paid } = summarizeDebts(
      [
        debt("Un amigo", null, 500, { direction: "receivable" }),
        debt("Otro amigo", null, 700, { direction: "receivable", paidOn: "2026-10-02" }),
      ],
      "receivable",
      "2026-10",
    );
    expect(pending.map((d) => d.description)).toEqual(["Un amigo"]);
    expect(paid.map((d) => d.description)).toEqual(["Otro amigo"]);
  });
});

describe("cuándo vence una cuota", () => {
  it("cuenta días de calendario, también entre meses", () => {
    expect(daysBetween("2026-10-20", "2026-11-15")).toBe(26);
    expect(daysBetween("2026-10-20", "2026-10-18")).toBe(-2);
  });

  it("lo dice desde hoy, y una vencida lo marca", () => {
    const today = "2026-10-20";
    expect(dueLabel("2026-10-20", today)).toEqual({ text: "vence hoy", overdue: false });
    expect(dueLabel("2026-10-21", today)).toEqual({ text: "vence mañana", overdue: false });
    expect(dueLabel("2026-11-15", today)).toEqual({ text: "en 26 días", overdue: false });
    expect(dueLabel("2026-10-19", today)).toEqual({ text: "venció ayer", overdue: true });
    expect(dueLabel("2026-10-18", today)).toEqual({ text: "venció hace 2 días", overdue: true });
  });
});
