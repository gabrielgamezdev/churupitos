import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo } from "react";

import { EnvelopeChip } from "@/components/envelope-chip";
import { List, ListRow } from "@/components/list";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances, type AccountBalance } from "@/features/balances/use-account-balances";
import { BudgetCheckList } from "@/features/budget/budget-check-list";
import { BudgetTotals } from "@/features/budget/budget-totals";
import { incomeTotals, summarizePlan } from "@/features/budget/budget-view";
import { IncomeRow, IncomeRowSkeleton } from "@/features/budget/income-row";
import { budgetMonth, budgetMonthRange } from "@/features/budget/months";
import { PlanRow, PlanRowSkeleton } from "@/features/budget/plan-row";
import {
  budgetChecksQuery,
  budgetLinesQuery,
  expectedIncomesQuery,
  type BudgetLine,
  type ExpectedIncome,
} from "@/features/budget/queries";
import { envelopesQuery, type Envelope } from "@/features/envelopes/queries";
import { MonthPicker } from "@/features/ledger/month-picker";
import { OperationDetail } from "@/features/ledger/operation-detail";
import { isMonth, monthName, monthOf, today } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/budget/")({
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
  const lines = useQuery(budgetLinesQuery(month));
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
      <StaleDataBanner queries={[checks, incomes, lines, accounts, envelopes]} />

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
          <>
            <IncomesSection
              month={month}
              incomes={incomes}
              accounts={accounts}
              accountById={accountById}
              envelopeById={envelopeById}
            />
            <PlanSection month={month} lines={lines} envelopes={envelopes} />
            <section aria-labelledby="checks-title" className="flex flex-col gap-3">
              <h2 id="checks-title" className="text-heading">
                El cuadre
              </h2>
              <BudgetCheckList checks={monthChecks} />
            </section>
          </>
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
        progress={
          totals && totals.expectedUsdCents > 0
            ? {
                label: "Cobrado",
                cents: totals.receivedUsdCents,
                of: totals.expectedUsdCents,
              }
            : undefined
        }
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

interface PlanSectionProps {
  month: string;
  lines: UseQueryResult<BudgetLine[]>;
  envelopes: UseQueryResult<Envelope[]>;
}

// «Distribución de los ingresos» del Excel: sus totales y cada sobre con lo planeado y
// lo que le llegó. Los de $0, plegados al final.
function PlanSection({ month, lines, envelopes }: PlanSectionProps) {
  const plan = lines.data && envelopes.data ? summarizePlan(lines.data, envelopes.data) : undefined;
  return (
    <section aria-labelledby="plan-title" className="flex flex-col gap-3">
      <h2 id="plan-title" className="text-heading">
        El plan
      </h2>
      <BudgetTotals
        items={[
          { label: "Planeado", cents: plan?.totals.plannedUsdCents },
          { label: "Entregado", cents: plan?.totals.deliveredUsdCents },
          { label: "Falta", cents: plan?.totals.pendingUsdCents },
        ]}
      />
      {plan ? (
        <>
          {plan.planned.length === 0 ? (
            <EmptyState className="rounded-lg bg-surface-raised">
              Ningún sobre tiene plan en {monthName(month)}
            </EmptyState>
          ) : (
            <List>
              {plan.planned.map((row) => (
                <PlanRow key={row.line.id} {...row} />
              ))}
            </List>
          )}
          {plan.unplanned.length > 0 && (
            <Collapsible className="flex flex-col gap-2">
              <CollapsibleTrigger className="group flex min-h-tap w-full items-center justify-between gap-3 rounded-lg bg-surface-raised px-4 text-body text-ink-muted active:bg-surface-sunken">
                <span>Sin plan este mes · {plan.unplanned.length}</span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 transition-transform group-data-[state=open]:rotate-180"
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <List>
                  {plan.unplanned.map(({ envelope }) => (
                    <ListRow key={envelope.id} asChild className="text-ink-muted">
                      <Link to="/envelopes/$envelopeId" params={{ envelopeId: envelope.id }}>
                        <EnvelopeChip
                          name={envelope.name}
                          emoji={envelope.emoji}
                          isThirdParty={envelope.isThirdParty}
                          className="text-body"
                        />
                        <ChevronRight aria-hidden="true" className="size-5" />
                      </Link>
                    </ListRow>
                  ))}
                </List>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      ) : (
        <MissingData
          queries={[lines, envelopes]}
          errorMessage="No se pudo cargar el plan."
          skeleton={
            <List aria-hidden="true">
              <PlanRowSkeleton />
              <PlanRowSkeleton />
              <PlanRowSkeleton />
            </List>
          }
        />
      )}
    </section>
  );
}
