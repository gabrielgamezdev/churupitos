import { describe, expect, it } from "vitest";

import { formatRate, incomeTotals } from "./budget-view";
import type { ExpectedIncome } from "./queries";

const income = (expectedUsdCents: number, received: boolean): ExpectedIncome => ({
  id: String(expectedUsdCents),
  name: "Bono",
  emoji: null,
  expectedUsdCents,
  receipt: received
    ? {
        operationId: "op",
        day: "2026-01-10",
        accountId: "Banco A",
        currency: "VES",
        amountCents: expectedUsdCents * 400,
        usdCents: expectedUsdCents,
      }
    : null,
});

describe("los ingresos del mes", () => {
  it("suman como el Excel: lo cobrado son los ✅ y lo que falta, los ⏳", () => {
    expect(incomeTotals([income(100000, true), income(10000, false), income(5000, true)])).toEqual({
      expectedUsdCents: 115000,
      receivedUsdCents: 105000,
      pendingUsdCents: 10000,
    });
    expect(incomeTotals([])).toEqual({
      expectedUsdCents: 0,
      receivedUsdCents: 0,
      pendingUsdCents: 0,
    });
  });

  it("R8: la tasa de un cobro, con dos decimales", () => {
    expect(formatRate(40000000, 100000)).toBe("400,00");
    // Bs 1.234,56 por $3: 411,52 periódico. barrido:permitido (cifra inventada)
    expect(formatRate(123456, 300)).toBe("411,52");
    expect(formatRate(1250000000, 100000)).toBe("12.500,00"); // barrido:permitido (cifra inventada)
  });
});
