import { describe, expect, it } from "vitest";

import { describeUpdatedAt } from "./updated-at";

describe("describeUpdatedAt", () => {
  const now = new Date(2026, 9, 15, 18, 0);

  it("de hoy, solo la hora", () => {
    const text = describeUpdatedAt(new Date(2026, 9, 15, 8, 15), now);
    expect(text).toMatch(/^de las 8:15/);
  });

  it("de otro día, también el día, para no tomarlo por de hoy", () => {
    const text = describeUpdatedAt(new Date(2026, 9, 13, 8, 15), now);
    expect(text).toMatch(/^del 13 /);
    expect(text).toContain("8:15");
  });
});
