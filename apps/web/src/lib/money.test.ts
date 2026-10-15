import { describe, expect, it } from "vitest";

import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("pinta los céntimos con coma y la moneda delante", () => {
    expect(formatMoney(10959, "VES")).toBe("Bs 109,59");
    expect(formatMoney(5, "USD")).toBe("$ 0,05");
    expect(formatMoney(0, "VES")).toBe("Bs 0,00");
  });

  it("separa los miles con punto, como se escriben en Venezuela", () => {
    expect(formatMoney(200000, "VES")).toBe("Bs 2.000,00"); // barrido:permitido (cifra inventada)
  });

  it("pone el signo delante de la moneda", () => {
    expect(formatMoney(-500, "USD")).toBe("-$ 5,00");
  });

  it("rechaza lo que no es un entero de céntimos", () => {
    expect(() => formatMoney(10.5, "VES")).toThrow();
  });
});
