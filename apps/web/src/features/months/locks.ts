import { addDays, addMonths, firstDay, monthOf } from "@/lib/months";

// Los meses cerrados (M12, R21): desde el corte, un mes se cierra solo el día 5 del
// siguiente, salvo que esté abierto a propósito, hasta el fin de ese día. La regla vive en
// la base; aquí se repite para decirlo antes de tocar el botón.

export type MonthLocks = {
  // El día del corte; sin él, ningún mes se cierra (la base local).
  cutOn: string | null;
  // Los meses abiertos a propósito, y hasta cuándo.
  openings: { month: string; openUntil: string }[];
};

// El día en que se cierra un mes: el 5 del siguiente.
export function closingDay(month: string): string {
  return addDays(firstDay(addMonths(month, 1)), 4);
}

// Si un mes (`AAAA-MM`) está cerrado hoy. `today` es el día en Caracas (R13) y `now`, el
// instante, para saber si una apertura sigue en pie.
export function isMonthClosed(month: string, locks: MonthLocks, today: string, now: Date) {
  if (locks.cutOn === null || today < closingDay(month)) return false;
  return !locks.openings.some(
    (opening) => opening.month === month && Date.parse(opening.openUntil) > now.getTime(),
  );
}

// Si el día de un movimiento cae en un mes cerrado.
export function isDayClosed(day: string, locks: MonthLocks, today: string, now: Date) {
  return isMonthClosed(monthOf(day), locks, today, now);
}

// Los meses cerrados que alguien abrió a propósito y siguen abiertos: Inicio los recuerda.
export function openedMonths(locks: MonthLocks, today: string, now: Date): string[] {
  return locks.openings
    .filter(
      (opening) =>
        Date.parse(opening.openUntil) > now.getTime() && today >= closingDay(opening.month),
    )
    .map((opening) => opening.month)
    .sort();
}
