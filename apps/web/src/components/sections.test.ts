import { describe, expect, it } from "vitest";

import { isSectionRoot, SECTIONS, sectionOf } from "./sections";

describe("las secciones de la barra", () => {
  it("cada pantalla cuelga de su sección", () => {
    expect(sectionOf("/")).toBe("home");
    expect(sectionOf("/currencies/ves")).toBe("home");
    expect(sectionOf("/accounts/abc")).toBe("home");
    expect(sectionOf("/envelopes")).toBe("envelopes");
    expect(sectionOf("/envelopes/abc")).toBe("envelopes");
    expect(sectionOf("/debts")).toBe("debts");
    expect(sectionOf("/budget")).toBe("budget");
    expect(sectionOf("/settings")).toBe("settings");
    expect(sectionOf("/gallery")).toBe("settings");
  });

  it("Inicio va en el centro de las cinco", () => {
    expect(SECTIONS.map((section) => section.label)).toEqual([
      "Sobres",
      "Deudas",
      "Inicio",
      "Presupuesto",
      "Ajustes",
    ]);
  });

  it("sabe cuál es la primera pantalla de cada sección", () => {
    expect(isSectionRoot("/envelopes")).toBe(true);
    expect(isSectionRoot("/")).toBe(true);
    expect(isSectionRoot("/budget")).toBe(true);
    expect(isSectionRoot("/envelopes/abc")).toBe(false);
  });
});
