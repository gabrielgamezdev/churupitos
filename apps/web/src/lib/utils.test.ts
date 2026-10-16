import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("un estilo de texto y un color del design system no chocan", () => {
    expect(cn("text-money-in", "text-amount")).toBe("text-money-in text-amount");
    expect(cn("text-label bg-ves-soft text-ves")).toBe("text-label bg-ves-soft text-ves");
  });

  it("dos estilos de texto, o dos colores, sí: gana el último", () => {
    expect(cn("text-body", "text-caption")).toBe("text-caption");
    expect(cn("text-ink-muted", "text-third-party")).toBe("text-third-party");
  });

  it("conoce el alto de lo que se toca", () => {
    expect(cn("h-tap", "h-10")).toBe("h-10");
  });
});
