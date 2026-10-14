import { describe, expect, it } from "vitest";

import { safeRedirect } from "./safe-redirect";

describe("safeRedirect", () => {
  it("deja pasar una ruta de la propia app", () => {
    expect(safeRedirect("/cuentas?moneda=VES")).toBe("/cuentas?moneda=VES");
  });

  it("rechaza otro sitio, también disfrazado de ruta", () => {
    expect(safeRedirect("https://otro-sitio.test")).toBe("/");
    expect(safeRedirect("//otro-sitio.test")).toBe("/");
    expect(safeRedirect("/\\otro-sitio.test")).toBe("/");
  });

  it("vuelve al inicio si no hay adónde volver", () => {
    expect(safeRedirect(undefined)).toBe("/");
    expect(safeRedirect("")).toBe("/");
  });
});
