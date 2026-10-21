import { describe, expect, it } from "vitest";

import {
  isFormScreen,
  isSectionRoot,
  registerContext,
  SECTIONS,
  SECTIONS_BEFORE_REGISTER,
  sectionOf,
} from "./sections";

describe("las secciones de la barra", () => {
  it("cada pantalla cuelga de su sección", () => {
    expect(sectionOf("/")).toBe("home");
    expect(sectionOf("/currencies/ves")).toBe("home");
    expect(sectionOf("/accounts/abc")).toBe("home");
    expect(sectionOf("/envelopes")).toBe("envelopes");
    expect(sectionOf("/envelopes/abc")).toBe("envelopes");
    expect(sectionOf("/debts")).toBe("debts");
    expect(sectionOf("/debts/new")).toBe("debts");
    expect(sectionOf("/budget")).toBe("budget");
    expect(sectionOf("/settings")).toBe("home");
    expect(sectionOf("/gallery")).toBe("home");
  });

  it("el ＋ de Registrar va en el centro, con dos secciones a cada lado", () => {
    const labels = SECTIONS.map((section) => section.label);
    labels.splice(SECTIONS_BEFORE_REGISTER, 0, "Registrar");
    expect(labels).toEqual(["Inicio", "Sobres", "Registrar", "Presupuesto", "Deudas"]);
  });

  it("Registrar abre con la cuenta o el sobre de la pantalla en la que se está", () => {
    expect(registerContext("/accounts/abc")).toEqual({ account: "abc" });
    expect(registerContext("/envelopes/xyz")).toEqual({ envelope: "xyz" });
    expect(registerContext("/envelopes")).toEqual({});
    expect(registerContext("/")).toEqual({});
  });

  it("sabe cuál es la primera pantalla de cada sección", () => {
    expect(isSectionRoot("/envelopes")).toBe(true);
    expect(isSectionRoot("/")).toBe(true);
    expect(isSectionRoot("/budget")).toBe(true);
    expect(isSectionRoot("/envelopes/abc")).toBe(false);
    expect(isSectionRoot("/settings")).toBe(false);
  });

  it("los formularios van sin barra", () => {
    expect(isFormScreen("/operations/new")).toBe(true);
    expect(isFormScreen("/operations/abc/edit")).toBe(true);
    expect(isFormScreen("/debts/new")).toBe(true);
    expect(isFormScreen("/debts/abc/edit")).toBe(true);
    expect(isFormScreen("/debts")).toBe(false);
    expect(isFormScreen("/envelopes/abc")).toBe(false);
  });
});
