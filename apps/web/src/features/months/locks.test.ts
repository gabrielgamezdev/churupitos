import { describe, expect, it } from "vitest";

import { closingDay, isDayClosed, isMonthClosed, openedMonths, type MonthLocks } from "./locks";

const NOW = new Date("2026-12-10T15:00:00Z");
const AFTER: MonthLocks = { cutOn: "2026-11-01", openings: [] };

describe("los meses cerrados (R21)", () => {
  it("un mes se cierra el día 5 del siguiente", () => {
    expect(closingDay("2026-11")).toBe("2026-12-05");
    expect(closingDay("2026-12")).toBe("2027-01-05");
  });

  it("antes del día 5, el mes anterior sigue abierto; desde ese día, cerrado", () => {
    expect(isMonthClosed("2026-11", AFTER, "2026-12-04", NOW)).toBe(false);
    expect(isMonthClosed("2026-11", AFTER, "2026-12-05", NOW)).toBe(true);
    expect(isMonthClosed("2026-12", AFTER, "2026-12-31", NOW)).toBe(false);
  });

  it("sin la marca del corte, ningún mes se cierra", () => {
    expect(isMonthClosed("2026-01", { cutOn: null, openings: [] }, "2026-12-10", NOW)).toBe(false);
  });

  it("abierto a propósito, hasta que se acaba la apertura", () => {
    const opened: MonthLocks = {
      ...AFTER,
      openings: [{ month: "2026-10", openUntil: "2026-12-11T04:00:00Z" }],
    };
    expect(isDayClosed("2026-10-15", opened, "2026-12-10", NOW)).toBe(false);
    expect(isDayClosed("2026-10-15", opened, "2026-12-11", new Date("2026-12-11T05:00:00Z"))).toBe(
      true,
    );
    expect(openedMonths(opened, "2026-12-10", NOW)).toEqual(["2026-10"]);
  });

  it("una apertura vencida, o de un mes que aún no se cerraba, no se recuerda", () => {
    const locks: MonthLocks = {
      ...AFTER,
      openings: [
        { month: "2026-10", openUntil: "2026-12-09T04:00:00Z" },
        { month: "2026-12", openUntil: "2026-12-11T04:00:00Z" },
      ],
    };
    expect(openedMonths(locks, "2026-12-10", NOW)).toEqual([]);
  });
});
