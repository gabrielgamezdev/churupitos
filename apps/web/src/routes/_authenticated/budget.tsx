import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { budgetMonth, budgetMonthRange } from "@/features/budget/months";
import { budgetChecksQuery } from "@/features/budget/queries";
import { MonthPicker } from "@/features/ledger/month-picker";
import { isMonth, monthName, monthOf, today } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/budget")({
  // Una función y no un esquema, como en las cuentas (TRAMPAS). Sin mes, o con uno sin
  // presupuesto, el mes en curso.
  validateSearch: (search: Record<string, unknown>): { month?: string } => ({
    month: isMonth(search.month) ? search.month : undefined,
  }),
  component: BudgetPage,
});

// Presupuesto: la hoja PRESUPUESTO de un mes. Abre en el mes en curso y llega al
// siguiente si ya se planificó.
function BudgetPage() {
  const navigate = Route.useNavigate();
  const currentMonth = monthOf(today());
  const checks = useQuery(budgetChecksQuery);
  const range = checks.data
    ? budgetMonthRange(
        checks.data.map((row) => row.month),
        currentMonth,
      )
    : undefined;
  const month = budgetMonth(Route.useSearch().month, currentMonth, range);
  const monthChecks = checks.data?.find((row) => row.month === month);

  const changeMonth = (next: string) =>
    void navigate({
      search: { month: next === currentMonth ? undefined : next },
      // Como en el libro: cambiar de mes no deja rastro en el historial.
      replace: true,
    });

  return (
    <Screen>
      <ScreenHeader title="Presupuesto" />
      <StaleDataBanner queries={[checks]} />

      <section aria-labelledby="month-title" className="flex flex-col gap-2">
        <MonthPicker
          month={month}
          isCurrent={month === currentMonth}
          hasPrevious={range !== undefined && month > range.first}
          hasNext={range !== undefined && month < range.last}
          onChange={changeMonth}
        />
        {month > currentMonth && (
          <p className="px-1 text-caption text-ink-muted">
            Todavía no empieza: es lo que se planificó para {monthName(month)}.
          </p>
        )}
      </section>

      {checks.data ? (
        !monthChecks && (
          <EmptyState className="rounded-lg bg-surface-raised">
            Sin presupuesto en {monthName(month)}
          </EmptyState>
        )
      ) : (
        <MissingData
          queries={[checks]}
          errorMessage="No se pudo cargar el presupuesto."
          skeleton={<Skeleton aria-label="Cargando" className="h-24 w-full" />}
        />
      )}
    </Screen>
  );
}
