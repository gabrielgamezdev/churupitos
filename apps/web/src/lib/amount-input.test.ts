import { describe, expect, it } from "vitest";

import {
  amountInputText,
  cashierAmount,
  MAX_AMOUNT_DIGITS,
  parseAmountInput,
} from "./amount-input";

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

describe("el monto como en un cajero", () => {
  it("cada cifra entra por la derecha", () => {
    expect(cashierAmount("1")).toBe("0,01");
    expect(cashierAmount("0,012")).toBe("0,12");
    expect(cashierAmount("0,123")).toBe("1,23");
    expect(cashierAmount("1,234")).toBe("12,34");
    expect(cashierAmount("12,345")).toBe("123,45");
    expect(cashierAmount("123,456")).toBe("1.234,56"); // barrido:permitido (cifra inventada)
  });

  it("borrar saca la última cifra, y sin ninguna el campo queda vacío", () => {
    expect(cashierAmount("1.234,5")).toBe("123,45");
    expect(cashierAmount("0,0")).toBe("");
    expect(cashierAmount("")).toBe("");
  });

  it("los ceros de delante no cuentan", () => {
    expect(cashierAmount("0,000")).toBe("");
    expect(cashierAmount("0,005")).toBe("0,05");
  });

  it("con todas las cifras ocupadas, una más no entra", () => {
    const full = cashierAmount("9".repeat(MAX_AMOUNT_DIGITS));
    expect(cashierAmount(`${full}1`)).toBe(full);
  });

  it("lo que se ve se vuelve a leer igual", () => {
    for (const typed of ["1", "15", "150000", "123456789012"]) {
      const text = cashierAmount(typed);
      expect(parseAmountInput(text)).toBe(Number(typed));
      expect(amountInputText(Number(typed))).toBe(text);
    }
  });
});
