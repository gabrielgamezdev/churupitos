import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  budgetChecksQuery,
  budgetLinesQuery,
  expectedIncomesQuery,
  type BudgetLine,
  type ExpectedIncome,
} from "@/features/budget/queries";
import { envelopesQuery, type Envelope } from "@/features/envelopes/queries";
import { budgetOrder } from "@/features/operations/envelope-order";
import { PlanForm } from "@/features/plan/plan-form";
import { monthRows, planFromMonth, planFromPrevious } from "@/features/plan/plan-form-schema";
import { addMonths, isMonth, monthName } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/budget/$month/plan")({
  component: PlanPage,
});

// «Planear» un mes (M10): si ya tiene presupuesto, se cambia; si no, se prepara copiando
// el anterior, que tiene que ser el último con presupuesto (R19).
function PlanPage() {
  const { month } = Route.useParams();
  const valid = isMonth(month);
  const header = {
    title: valid ? `Planear ${monthName(month)}` : "Planear",
    back: { to: "/budget", search: valid ? { month } : {} },
    backLabel: "Volver sin guardar",
  } as const;
  const incomes = useQuery({ ...expectedIncomesQuery(month), enabled: valid });
  const lines = useQuery({ ...budgetLinesQuery(month), enabled: valid });
  const empty = incomes.data?.length === 0 && lines.data?.length === 0;
  // De dónde se copia un mes nuevo: solo hace falta si está vacío.
  const previousMonth = valid ? addMonths(month, -1) : month;
  const sourceIncomes = useQuery({ ...expectedIncomesQuery(previousMonth), enabled: empty });
  const sourceLines = useQuery({ ...budgetLinesQuery(previousMonth), enabled: empty });
  const checks = useQuery(budgetChecksQuery);
  const envelopes = useQuery(envelopesQuery);

  if (!valid) {
    return (
      <Screen>
        <ScreenHeader {...header} />
        <EmptyState className="rounded-lg bg-surface-raised">Ese mes no existe.</EmptyState>
      </Screen>
    );
  }
  const loading = (
    <Screen>
      <ScreenHeader {...header} />
      <MissingData
        queries={[
          incomes,
          lines,
          checks,
          envelopes,
          ...(empty ? [sourceIncomes, sourceLines] : []),
        ]}
        errorMessage="No se pudo cargar el presupuesto."
        skeleton={<Skeleton aria-label="Cargando" className="h-96 w-full" />}
      />
    </Screen>
  );
  if (!incomes.data || !lines.data || !checks.data || !envelopes.data) return loading;

  if (!empty) {
    return (
      <Screen className="pb-0">
        <ScreenHeader {...header} />
        <EditMonth
          month={month}
          incomes={incomes.data}
          lines={lines.data}
          envelopes={envelopes.data}
        />
      </Screen>
    );
  }

  // Un mes nuevo es el siguiente al último que tiene presupuesto.
  const last = checks.data.at(-1)?.month;
  if (last && month !== addMonths(last, 1)) {
    return (
      <Screen>
        <ScreenHeader {...header} />
        <EmptyState className="rounded-lg bg-surface-raised">
          Los meses se preparan seguidos: el siguiente es {monthName(addMonths(last, 1))}.
        </EmptyState>
      </Screen>
    );
  }
  if (!sourceIncomes.data || !sourceLines.data) return loading;
  return (
    <Screen className="pb-0">
      <ScreenHeader {...header}>
        <p className="text-caption text-ink-muted">
          Copiado de {monthName(previousMonth)}: cambia lo que haga falta.
        </p>
      </ScreenHeader>
      <NewMonth
        month={month}
        incomes={sourceIncomes.data}
        lines={sourceLines.data}
        envelopes={envelopes.data}
      />
    </Screen>
  );
}

interface MonthProps {
  month: string;
  incomes: ExpectedIncome[];
  lines: BudgetLine[];
  envelopes: Envelope[];
}

function EditMonth({ month, incomes, lines, envelopes }: MonthProps) {
  const done = useDone(month);
  // Una vez, al abrir: lo que llegue después de la base no pisa lo que se está escribiendo.
  const [initial] = useState(() =>
    planFromMonth(
      incomes,
      lines,
      budgetOrder(envelopes).map((envelope) => envelope.id),
    ),
  );
  // Como estaba al abrir: lo que «Deshacer» vuelve a guardar.
  const [previous] = useState(() => ({ month, ...monthRows(initial) }));
  return (
    <PlanForm
      month={month}
      initial={initial}
      previous={previous}
      envelopes={envelopes}
      onSaved={done}
    />
  );
}

// Un mes nuevo, copiado del anterior (R19): nada se guarda hasta «Guardar». Los sobres
// archivados no se copian (R20).
function NewMonth({ month, incomes, lines, envelopes }: MonthProps) {
  const done = useDone(month);
  const [initial] = useState(() =>
    planFromPrevious(
      incomes,
      lines.filter(
        (line) => !envelopes.find((envelope) => envelope.id === line.envelopeId)?.archived,
      ),
      budgetOrder(envelopes).map((envelope) => envelope.id),
      () => crypto.randomUUID(),
    ),
  );
  return <PlanForm month={month} initial={initial} envelopes={envelopes} onSaved={done} />;
}

// Al guardar, el presupuesto de ese mes, en lugar de esta pantalla: atrás no vuelve a ella.
function useDone(month: string) {
  const router = useRouter();
  return () => void router.navigate({ to: "/budget", search: { month }, replace: true });
}
