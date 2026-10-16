import { describe, expect, it } from "vitest";

import {
  addMonths,
  dayLabel,
  isMonth,
  lastDay,
  monthLabel,
  monthName,
  monthOf,
  today,
} from "./months";

describe("los meses del libro", () => {
  it("el día de hoy es el del teléfono, no el de UTC", () => {
    // Las 23:30 del 31 de octubre: en UTC ya es 1 de noviembre (R13).
    expect(today(new Date(2026, 9, 31, 23, 30))).toBe("2026-10-31");
  });

  it("suma y resta meses cruzando el año", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-10", 0)).toBe("2026-10");
  });

  it("sabe el último día de cada mes, también en bisiesto", () => {
    expect(lastDay("2026-02")).toBe("2026-02-28");
    expect(lastDay("2028-02")).toBe("2028-02-29");
    expect(lastDay("2026-10")).toBe("2026-10-31");
  });

  it("reconoce un mes y lo saca de un día", () => {
    expect(isMonth("2026-10")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth(undefined)).toBe(false);
    expect(monthOf("2026-10-15")).toBe("2026-10");
  });

  it("nombra el mes como el Excel", () => {
    expect(monthLabel("2026-10")).toBe("Octubre 2026");
    expect(monthName("2026-09")).toBe("septiembre");
  });

  it("nombra cada día del libro", () => {
    expect(dayLabel("2026-10-15", "2026-10-15")).toBe("Hoy");
    expect(dayLabel("2026-10-14", "2026-10-15")).toBe("Ayer");
    expect(dayLabel("2026-09-30", "2026-10-01")).toBe("Ayer");
    expect(dayLabel("2026-10-12", "2026-10-15")).toBe("Lunes 12");
  });
});
