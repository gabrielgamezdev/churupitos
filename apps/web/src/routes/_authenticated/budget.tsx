import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { List } from "@/components/list";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances, type AccountBalance } from "@/features/balances/use-account-balances";
import { BudgetTotals } from "@/features/budget/budget-totals";
import { incomeTotals } from "@/features/budget/budget-view";
import { IncomeRow, IncomeRowSkeleton } from "@/features/budget/income-row";
import { budgetMonth, budgetMonthRange } from "@/features/budget/months";
import {
  budgetChecksQuery,
  expectedIncomesQuery,
  type ExpectedIncome,
} from "@/features/budget/queries";
import { envelopesQuery, type Envelope } from "@/features/envelopes/queries";
import { MonthPicker } from "@/features/ledger/month-picker";
import { OperationDetail } from "@/features/ledger/operation-detail";
import { isMonth, monthName, monthOf, today } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/budget")({
  // Una función y no un esquema, como en las cuentas (TRAMPAS). Sin mes, o con uno sin
  // presupuesto, el mes en curso.
  validateSearch: (search: Record<string, unknown>): { month?: string } => ({
    month: isMonth(search.month) ? search.month : undefined,
  }),
  component: BudgetPage,
});

// Presupuesto: la hoja PRESUPUESTO de un mes, con los ingresos primero y después el
// plan. Abre en el mes en curso y llega al siguiente si ya se planificó.
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

  // Se piden a la vez que el cuadre, sin esperar a saber si el mes tiene presupuesto:
  // casi siempre lo tiene, y si no, llegan vacías.
  const incomes = useQuery(expectedIncomesQuery(month));
  const accounts = useAccountBalances();
  const envelopes = useQuery(envelopesQuery);

  const accountById = useMemo(
    () => Object.fromEntries((accounts.data ?? []).map((row) => [row.accountId, row])),
    [accounts.data],
  );
  const envelopeById = useMemo(
    () => Object.fromEntries((envelopes.data ?? []).map((row) => [row.id, row])),
    [envelopes.data],
  );

  const changeMonth = (next: string) =>
    void navigate({
      search: { month: next === currentMonth ? undefined : next },
      // Como en el libro: cambiar de mes no deja rastro en el historial.
      replace: true,
    });

  return (
    <Screen>
      <ScreenHeader title="Presupuesto" />
      <StaleDataBanner queries={[checks, incomes, accounts, envelopes]} />

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
        monthChecks ? (
          <IncomesSection
            month={month}
            incomes={incomes}
            accounts={accounts}
            accountById={accountById}
            envelopeById={envelopeById}
          />
        ) : (
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

interface IncomesSectionProps {
  month: string;
  incomes: UseQueryResult<ExpectedIncome[]>;
  accounts: UseQueryResult<AccountBalance[]>;
  accountById: Record<string, AccountBalance>;
  envelopeById: Record<string, Envelope>;
}

// «Ingresos esperados» del Excel: sus totales y cada ingreso, con su cobro desplegable.
function IncomesSection({
  month,
  incomes,
  accounts,
  accountById,
  envelopeById,
}: IncomesSectionProps) {
  const totals = incomes.data ? incomeTotals(incomes.data) : undefined;
  return (
    <section aria-labelledby="incomes-title" className="flex flex-col gap-3">
      <h2 id="incomes-title" className="text-heading">
        Ingresos del mes
      </h2>
      <BudgetTotals
        items={[
          { label: "Se espera", cents: totals?.expectedUsdCents },
          { label: "Cobrado", cents: totals?.receivedUsdCents },
          { label: "Falta", cents: totals?.pendingUsdCents },
        ]}
      />
      {incomes.data && accounts.data ? (
        incomes.data.length === 0 ? (
          <EmptyState className="rounded-lg bg-surface-raised">
            Sin ingresos esperados en {monthName(month)}
          </EmptyState>
        ) : (
          <List>
            {incomes.data.map((income) => (
              <IncomeRow
                key={income.id}
                income={income}
                accountName={
                  income.receipt ? accountById[income.receipt.accountId]?.name : undefined
                }
                detail={
                  income.receipt && (
                    <OperationDetail
                      operationId={income.receipt.operationId}
                      accountById={accountById}
                      envelopeById={envelopeById}
                    />
                  )
                }
              />
            ))}
          </List>
        )
      ) : (
        <MissingData
          queries={[incomes, accounts]}
          errorMessage="No se pudieron cargar los ingresos."
          skeleton={
            <List aria-hidden="true">
              <IncomeRowSkeleton />
              <IncomeRowSkeleton />
              <IncomeRowSkeleton />
            </List>
          }
        />
      )}
    </section>
  );
}
