import { describe, expect, it } from "vitest";

import { isSectionRoot, sectionOf } from "./sections";

describe("las secciones de la barra", () => {
  it("cada pantalla cuelga de su sección", () => {
    expect(sectionOf("/")).toBe("home");
    expect(sectionOf("/currencies/ves")).toBe("home");
    expect(sectionOf("/accounts/abc")).toBe("home");
    expect(sectionOf("/envelopes")).toBe("envelopes");
    expect(sectionOf("/envelopes/abc")).toBe("envelopes");
    expect(sectionOf("/settings")).toBe("settings");
    expect(sectionOf("/gallery")).toBe("settings");
  });

  it("sabe cuál es la primera pantalla de cada sección", () => {
    expect(isSectionRoot("/envelopes")).toBe(true);
    expect(isSectionRoot("/")).toBe(true);
    expect(isSectionRoot("/envelopes/abc")).toBe(false);
  });
});
