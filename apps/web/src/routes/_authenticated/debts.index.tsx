import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Plus } from "lucide-react";

import { floatingActionClass } from "@/components/floating-action";

import { List, ListRow } from "@/components/list";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { DebtGroupList, DebtRow, DebtTotals } from "@/features/debts/debt-row";
import { summarizeDebts } from "@/features/debts/debt-view";
import { debtsQuery, debtTotalsQuery, type Debt } from "@/features/debts/queries";
import { monthOf, today } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/debts/")({
  component: DebtsPage,
});

// Deudas: lo que deben, por mes de vencimiento, y lo que les deben, como los bloques
// 📉 Deudas y 🔫 Deudores del Excel. Las pagadas del mes se ven aparte, plegadas.
function DebtsPage() {
  const debts = useQuery(debtsQuery);
  const totals = useQuery(debtTotalsQuery);
  const todayDay = today();

  if (!debts.data) {
    return (
      <Screen>
        <ScreenHeader title="Deudas" />
        <MissingData
          queries={[debts]}
          errorMessage="No se pudieron cargar las deudas."
          skeleton={
            <List aria-hidden="true">
              <DebtRowSkeleton />
              <DebtRowSkeleton />
              <DebtRowSkeleton />
            </List>
          }
        />
      </Screen>
    );
  }

  const currentMonth = monthOf(todayDay);
  const { groups, paid } = summarizeDebts(debts.data, "payable", currentMonth);
  const receivable = summarizeDebts(debts.data, "receivable", currentMonth);
  return (
    <Screen>
      <ScreenHeader title="Deudas" />
      <StaleDataBanner queries={[debts, totals]} />

      {totals.data ? (
        <DebtTotals totals={totals.data} />
      ) : (
        <MissingData
          queries={[totals]}
          errorMessage="No se pudo cargar lo pendiente."
          skeleton={<DebtTotals totals={undefined} />}
        />
      )}

      <section aria-labelledby="payable-title" className="flex flex-col gap-3">
        <h2 id="payable-title" className="text-heading">
          Lo que deben
        </h2>
        {groups.length === 0 ? (
          <EmptyState className="rounded-lg bg-surface-raised">No deben nada.</EmptyState>
        ) : (
          groups.map((group) => (
            <DebtGroupList key={group.month ?? "sin-fecha"} group={group} today={todayDay} />
          ))
        )}
        <PaidDebts debts={paid} today={todayDay} />
      </section>

      <section aria-labelledby="receivable-title" className="flex flex-col gap-3">
        <h2 id="receivable-title" className="text-heading">
          Lo que les deben
        </h2>
        {receivable.pending.length === 0 ? (
          <EmptyState className="rounded-lg bg-surface-raised">No les deben nada.</EmptyState>
        ) : (
          <List>
            {receivable.pending.map((debt) => (
              <DebtRow key={debt.id} debt={debt} today={todayDay} />
            ))}
          </List>
        )}
        <PaidDebts debts={receivable.paid} today={todayDay} />
      </section>

      <div aria-hidden="true" className="h-tap" />
      <Link to="/debts/new" className={floatingActionClass}>
        <Plus aria-hidden="true" />
        Agregar
      </Link>
    </Screen>
  );
}

// Mientras carga: el esqueleto de una fila.
function DebtRowSkeleton() {
  return (
    <ListRow>
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/5" />
    </ListRow>
  );
}

// Las pagadas del mes, como las ✅ del Excel: se ven, plegadas, pero ya no se deben.
function PaidDebts({ debts, today }: { debts: Debt[]; today: string }) {
  if (debts.length === 0) return null;
  return (
    <Collapsible className="flex flex-col gap-2">
      <CollapsibleTrigger className="group flex min-h-tap w-full items-center justify-between gap-3 rounded-lg bg-surface-raised px-4 text-body text-ink-muted active:bg-surface-sunken">
        <span>Pagadas este mes · {debts.length}</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <List>
          {debts.map((debt) => (
            <DebtRow key={debt.id} debt={debt} today={today} />
          ))}
        </List>
      </CollapsibleContent>
    </Collapsible>
  );
}
