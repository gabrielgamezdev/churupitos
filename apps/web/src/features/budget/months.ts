// Los meses del presupuesto. Se recorre desde el primero que tiene hasta el último, que
// puede ser el siguiente al de hoy: se planifica antes de que empiece (DOMINIO §2). El
// mes en curso siempre está, aunque todavía no tenga presupuesto.

export type BudgetMonthRange = { first: string; last: string };

export function budgetMonthRange(months: string[], currentMonth: string): BudgetMonthRange {
  const all = [...months, currentMonth].sort();
  return { first: all[0]!, last: all[all.length - 1]! };
}

// El mes que se enseña: el pedido, si está dentro; si no, el de hoy. Mientras no se
// sabe hasta dónde llega, el pedido, para no saltar de mes al terminar de cargar.
export function budgetMonth(
  requested: string | undefined,
  currentMonth: string,
  range: BudgetMonthRange | undefined,
): string {
  if (!requested) return currentMonth;
  if (!range) return requested;
  return requested >= range.first && requested <= range.last ? requested : currentMonth;
}
