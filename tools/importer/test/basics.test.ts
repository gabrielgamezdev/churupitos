import { describe, expect, it } from "vitest";
import { buildCatalog, CatalogError } from "../src/catalog.ts";
import { parseDateText, serialToIsoDate } from "../src/dates.ts";
import { parseAmountText, toCents } from "../src/money.ts";
import { normalizeLabel, normalizeText } from "../src/text.ts";
import { isoToSerial } from "./workbook-builder.ts";

describe("importes a céntimos", () => {
  it("quita el ruido de coma flotante", () => {
    expect(toCents(4733.020000000002)).toBe(473302);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(1e-10)).toBe(0);
  });

  it("redondea sobre lo que se ve en la celda, con la mitad lejos del cero", () => {
    expect(toCents(1.005)).toBe(101);
    expect(toCents(-12.345)).toBe(-1235);
    expect(toCents(-12.344)).toBe(-1234);
    expect(toCents(150.12345678901)).toBe(15012);
  });

  it("entiende importes escritos como texto, con su moneda si la dicen", () => {
    expect(parseAmountText("20 USDT")).toEqual({ cents: 2000, currency: "USD" });
    expect(parseAmountText("3000bs")).toEqual({ cents: 300000, currency: "VES" });
    expect(parseAmountText("$10,00")).toEqual({ cents: 1000, currency: "USD" });
    expect(parseAmountText("2.000,00")).toEqual({ cents: 200000, currency: null }); // barrido:permitido
    expect(parseAmountText("1.250")).toEqual({ cents: 125000, currency: null });
    expect(parseAmountText("nada")).toBeNull();
  });
});

describe("fechas", () => {
  it("convierte el número de serie del Excel sin depender de la zona horaria", () => {
    expect(serialToIsoDate(isoToSerial("2026-01-31"))).toBe("2026-01-31");
    expect(serialToIsoDate(45658)).toBe("2025-01-01");
  });

  it("entiende las fechas escritas a mano y rechaza las imposibles", () => {
    expect(parseDateText("14/01/2026")).toBe("2026-01-14");
    expect(parseDateText("14-1-26")).toBe("2026-01-14");
    expect(parseDateText("2026-01-14")).toBe("2026-01-14");
    expect(parseDateText("31/02/2026")).toBeNull();
    expect(parseDateText("???")).toBeNull();
  });
});

describe("textos", () => {
  it("quita lo invisible pero respeta los emoji", () => {
    expect(normalizeText("  🏦\n  Ahorro ")).toBe("🏦 Ahorro");
    expect(normalizeText("Café")).toBe("Café");
    expect(normalizeText("👨‍💻 Ana")).not.toBe(normalizeText("👤 Ana"));
  });

  it("reconoce títulos y cabeceras aunque cambien de emoji o de acentos", () => {
    expect(normalizeLabel("📦 Distribución de los ingresos")).toBe("distribucion de los ingresos");
    expect(normalizeLabel("Total $ con 'Otro'")).toBe("total $ con otro");
  });
});

describe("el catálogo", () => {
  const base = {
    accounts: [{ name: "Banco A", currency: "VES", sheets: ["BANCO A"] }],
    envelopes: [
      { name: "Ahorro", aliases: ["🏦 Ahorro"] },
      { name: "Otro", third_party: true, aliases: ["Otro"] },
    ],
    incomes: [{ name: "Bono", aliases: ["💰 Bono"] }],
  };

  it("traduce cada texto del Excel a su sobre", () => {
    const catalog = buildCatalog(base);
    expect(catalog.envelopeByAlias.get("🏦 Ahorro")).toBe("Ahorro");
    expect(catalog.accountBySheet.get("BANCO A")).toBe("Banco A");
    expect(catalog.envelopes.map((e) => [e.name, e.thirdParty])).toEqual([
      ["Ahorro", false],
      ["Otro", true],
    ]);
  });

  it("rechaza un texto que apunta a dos sobres", () => {
    const envelopes = [...base.envelopes, { name: "Comida", aliases: ["🏦 Ahorro"] }];
    expect(() => buildCatalog({ ...base, envelopes })).toThrow(CatalogError);
  });

  it("D6: rechaza dos sobres de dinero ajeno", () => {
    const envelopes = [...base.envelopes, { name: "Ajeno", third_party: true, aliases: ["Ajeno"] }];
    expect(() => buildCatalog({ ...base, envelopes })).toThrow(/dinero ajeno/);
  });

  it("explica qué falta cuando no tiene la forma esperada", () => {
    expect(() => buildCatalog({ accounts: [{ name: "Banco A" }] })).toThrow(CatalogError);
  });
});
