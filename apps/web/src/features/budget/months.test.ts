import { describe, expect, it } from "vitest";

import { budgetMonth, budgetMonthRange } from "./months";

describe("los meses del presupuesto", () => {
  it("van del primero con presupuesto al siguiente al de hoy, si ya se planificó", () => {
    expect(budgetMonthRange(["2026-01", "2026-02", "2026-03"], "2026-02")).toEqual({
      first: "2026-01",
      last: "2026-03",
    });
  });

  it("el mes en curso siempre está, aunque no tenga presupuesto", () => {
    expect(budgetMonthRange(["2026-01"], "2026-02")).toEqual({
      first: "2026-01",
      last: "2026-02",
    });
    expect(budgetMonthRange([], "2026-02")).toEqual({ first: "2026-02", last: "2026-02" });
  });

  it("sin mes pedido, o con uno fuera, se queda en el de hoy", () => {
    const range = { first: "2026-01", last: "2026-03" };
    expect(budgetMonth(undefined, "2026-02", range)).toBe("2026-02");
    expect(budgetMonth("2026-03", "2026-02", range)).toBe("2026-03");
    expect(budgetMonth("2026-04", "2026-02", range)).toBe("2026-02");
    expect(budgetMonth("2025-12", "2026-02", range)).toBe("2026-02");
  });

  it("mientras carga, se queda en el pedido", () => {
    expect(budgetMonth("2026-03", "2026-02", undefined)).toBe("2026-03");
  });
});
