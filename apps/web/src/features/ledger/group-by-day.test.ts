import { describe, expect, it } from "vitest";

import { groupByDay } from "./group-by-day";
import type { LedgerEntry } from "./queries";

describe("groupByDay", () => {
  const entry = (entryId: string, day: string) => ({ entryId, day }) as LedgerEntry;

  it("agrupa por día sin cambiar el orden", () => {
    const days = groupByDay([
      entry("c", "2026-10-15"),
      entry("b", "2026-10-15"),
      entry("a", "2026-10-13"),
    ]);
    expect(days.map((d) => [d.day, d.entries.map((e) => e.entryId)])).toEqual([
      ["2026-10-15", ["c", "b"]],
      ["2026-10-13", ["a"]],
    ]);
  });
});
