import type { OperationItem } from "@/features/ledger/queries";
import type { Currency } from "@/lib/money";
import { foldText } from "@/lib/text";

// Lo que se puede filtrar en Movimientos (M7). Cada filtro, si está, deja solo las
// operaciones con algún asiento que lo cumpla.
export type MovementFilters = {
  currency?: Currency;
  account?: string;
  envelope?: string;
  // Quién la registró: un usuario del hogar, o `FROM_EXCEL` para lo importado.
  who?: string;
  // Lo que se busca en el concepto, sin mayúsculas ni tildes.
  q?: string;
};

export const FROM_EXCEL = "excel";

export function filterOperations(
  items: OperationItem[],
  filters: MovementFilters,
  currencyOf: (accountId: string) => Currency | undefined,
): OperationItem[] {
  const query = filters.q ? foldText(filters.q.trim()) : "";
  return items.filter(
    (item) =>
      (!filters.currency ||
        item.entries.some((entry) => currencyOf(entry.accountId) === filters.currency)) &&
      (!filters.account || item.entries.some((entry) => entry.accountId === filters.account)) &&
      (!filters.envelope || item.entries.some((entry) => entry.envelopeId === filters.envelope)) &&
      (!filters.who ||
        (filters.who === FROM_EXCEL ? item.createdBy === null : item.createdBy === filters.who)) &&
      (!query ||
        [item.description, ...item.entries.map((entry) => entry.description)].some((text) =>
          foldText(text).includes(query),
        )),
  );
}

// Cuántos filtros hay puestos, sin contar la búsqueda, que se ve siempre.
export function activeFilters(filters: MovementFilters): number {
  return [filters.currency, filters.account, filters.envelope, filters.who].filter(Boolean).length;
}
