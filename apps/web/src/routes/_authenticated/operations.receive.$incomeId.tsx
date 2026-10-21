import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  budgetLinesQuery,
  expectedIncomeQuery,
  expectedIncomesQuery,
  type BudgetLine,
} from "@/features/budget/queries";
import { envelopesQuery, type Envelope } from "@/features/envelopes/queries";
import { budgetOrder } from "@/features/operations/envelope-order";
import { proposeAllocation } from "@/features/receipts/allocation";
import { ReceiveForm, type IncomeToReceive } from "@/features/receipts/receive-form";
import { emptyReceiveForm } from "@/features/receipts/receive-form-schema";
import { today } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/operations/receive/$incomeId")({
  component: ReceivePage,
});

const HEADER = {
  title: "Cobrar",
  back: { to: "/budget" },
  backLabel: "Volver sin guardar",
} as const;

// Cobrar un ingreso esperado (M9): al guardar vuelve a Presupuesto, que ya lo enseña ✅.
function ReceivePage() {
  const { incomeId } = Route.useParams();
  const income = useQuery(expectedIncomeQuery(incomeId));
  const plan = useQuery({
    ...budgetLinesQuery(income.data?.month ?? ""),
    enabled: income.data !== undefined,
  });
  // Los demás ingresos del mes: para saber qué sobres comparten fuente.
  const incomes = useQuery({
    ...expectedIncomesQuery(income.data?.month ?? ""),
    enabled: income.data !== undefined,
  });
  const envelopes = useQuery(envelopesQuery);

  if (!income.data || !plan.data || !incomes.data || !envelopes.data) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <MissingData
          queries={[income, plan, incomes, envelopes]}
          errorMessage="No se pudo cargar el ingreso."
          skeleton={<Skeleton aria-label="Cargando" className="h-64 w-full" />}
        />
      </Screen>
    );
  }
  if (income.data.receipt) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <EmptyState className="rounded-lg bg-surface-raised">
          Este ingreso ya está cobrado: se corrige desde su movimiento.
        </EmptyState>
      </Screen>
    );
  }
  return (
    <NewReceipt
      income={income.data}
      plan={plan.data}
      otherIncomeNames={incomes.data
        .filter((other) => other.id !== income.data.id)
        .map((other) => other.name)}
      envelopes={envelopes.data}
    />
  );
}

function NewReceipt({
  income,
  plan,
  otherIncomeNames,
  envelopes,
}: {
  income: IncomeToReceive;
  plan: BudgetLine[];
  otherIncomeNames: string[];
  envelopes: Envelope[];
}) {
  const { session } = Route.useRouteContext();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Una vez al abrir: guardar dos veces lo mismo no duplica (ADR 0008).
  const [operationId] = useState(() => crypto.randomUUID());
  // El reparto se propone una vez, desde el plan: lo que se cambie después no se pisa.
  const [initial] = useState(() =>
    emptyReceiveForm({
      accountId: "",
      day: today(),
      incomeName: income.name,
      expectedUsdCents: income.expectedUsdCents,
      proposal: proposeAllocation(
        income.name,
        income.expectedUsdCents,
        plan,
        budgetOrder(envelopes).map((envelope) => envelope.id),
        otherIncomeNames,
      ),
    }),
  );

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/budget", replace: true });
  };

  return (
    // Sin el hueco de la barra: abajo va «Guardar», fijo.
    <Screen className="pb-0">
      <ScreenHeader {...HEADER} />
      <ReceiveForm
        operationId={operationId}
        income={income}
        plan={plan}
        initial={initial}
        rememberFor={session.user.id}
        onSaved={close}
      />
    </Screen>
  );
}
