import { describe, expect, it } from "vitest";

import { fitsCorrectionForm } from "./app-kinds";

const line = { isFee: false };
const fee = { isFee: true };

describe("lo que cabe en los formularios de corregir", () => {
  it("líneas, con una comisión o sin ella", () => {
    expect(fitsCorrectionForm([line])).toBe(true);
    expect(fitsCorrectionForm([line, line, fee])).toBe(true);
  });

  it("varias comisiones no: guardar perdería las demás", () => {
    expect(fitsCorrectionForm([line, fee, fee])).toBe(false);
  });

  it("solo comisiones tampoco: el formulario se quedaría sin líneas", () => {
    expect(fitsCorrectionForm([fee])).toBe(false);
  });
});
