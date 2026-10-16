import { describe, expect, it } from "vitest";

import { currencyFromSlug, currencySlug } from "@/lib/money";

import { currencyDetails } from "./currency-summary";

describe("currencyDetails", () => {
  it("con «Otro», da el total con «Otro» y las cuentas", () => {
    expect(currencyDetails("VES", 150000, 30000, 6)).toBe(
      "Con «Otro»: Bs 1.500,00 · 6 cuentas", // barrido:permitido (cifra inventada)
    );
  });

  it("sin «Otro», solo las cuentas, y una en singular", () => {
    expect(currencyDetails("USD", 34000, 0, 1)).toBe("1 cuenta");
  });
});

describe("la moneda en la dirección", () => {
  it("va y vuelve, y una que no existe no es ninguna", () => {
    expect(currencySlug("USD")).toBe("usd");
    expect(currencyFromSlug("ves")).toBe("VES");
    expect(currencyFromSlug("eur")).toBeNull();
  });
});
