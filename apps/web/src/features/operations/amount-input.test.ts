import { describe, expect, it } from "vitest";

import { parseAmountInput } from "./amount-input";

describe("lo que se teclea en un monto", () => {
  it("lee el formato de Venezuela, con coma decimal y punto de miles", () => {
    expect(parseAmountInput("1.234,56")).toBe(123456); // barrido:permitido (cifra inventada)
    expect(parseAmountInput("1234,5")).toBe(123450);
    expect(parseAmountInput("1.234")).toBe(123400);
    expect(parseAmountInput("1.234.567")).toBe(123456700); // barrido:permitido (cifra inventada)
  });

  it("lee también el punto decimal de un teclado en inglés", () => {
    expect(parseAmountInput("12.50")).toBe(1250);
    expect(parseAmountInput("12.5")).toBe(1250);
    expect(parseAmountInput("1,234.56")).toBe(123456); // barrido:permitido (cifra inventada)
  });

  it("ignora espacios y el símbolo de la moneda", () => {
    expect(parseAmountInput(" Bs 150 ")).toBe(15000);
    expect(parseAmountInput("$20")).toBe(2000);
  });

  it("rechaza lo que no es un monto", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("0")).toBeNull();
    expect(parseAmountInput("0,00")).toBeNull();
    expect(parseAmountInput("12,345")).toBeNull();
    expect(parseAmountInput("1,2,3")).toBeNull();
    expect(parseAmountInput("doce")).toBeNull();
    expect(parseAmountInput(",")).toBeNull();
  });
});
