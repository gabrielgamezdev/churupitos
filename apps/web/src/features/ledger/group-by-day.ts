// Una lista por días, sin cambiar el orden en que llega (lo más nuevo arriba).
export function groupByDay<T extends { day: string }>(items: T[]): { day: string; entries: T[] }[] {
  const days: { day: string; entries: T[] }[] = [];
  for (const item of items) {
    const last = days.at(-1);
    if (last?.day === item.day) last.entries.push(item);
    else days.push({ day: item.day, entries: [item] });
  }
  return days;
}
