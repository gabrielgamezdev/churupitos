import type { LedgerEntry } from "./queries";

export type LedgerDay = { day: string; entries: LedgerEntry[] };

// El libro por días, sin cambiar el orden en que llega (lo más nuevo arriba).
export function groupByDay(entries: LedgerEntry[]): LedgerDay[] {
  const days: LedgerDay[] = [];
  for (const entry of entries) {
    const last = days.at(-1);
    if (last?.day === entry.day) last.entries.push(entry);
    else days.push({ day: entry.day, entries: [entry] });
  }
  return days;
}
