import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { debtsQuery, type Debt } from "@/features/debts/queries";
import { OperationForm } from "@/features/operations/operation-form";
import { emptyOperationForm } from "@/features/operations/operation-form-schema";
import { today } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/operations/pay/$debtId")({
  component: PayDebtPage,
});

const HEADER = {
  title: "Pagar deuda",
  back: { to: "/debts" },
  backLabel: "Volver sin guardar",
} as const;

// Pagar una deuda (M13, R17): un gasto, con la deuda arriba, que al guardar la deja pagada
// en el mismo paso. Vuelve a Deudas, que ya la enseña pagada.
function PayDebtPage() {
  const { debtId } = Route.useParams();
  const debts = useQuery(debtsQuery);
  if (!debts.data) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <MissingData
          queries={[debts]}
          errorMessage="No se pudo cargar la deuda."
          skeleton={<Skeleton aria-label="Cargando" className="h-64 w-full" />}
        />
      </Screen>
    );
  }
  const debt = debts.data.find((candidate) => candidate.id === debtId);
  if (!debt || debt.paidOn !== null || debt.direction !== "payable") {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <EmptyState className="rounded-lg bg-surface-raised">
          {debt ? "Esta deuda no está por pagar." : "Esa deuda ya no existe."}
        </EmptyState>
      </Screen>
    );
  }
  return <PayDebt debt={debt} />;
}

function PayDebt({ debt }: { debt: Debt }) {
  const { session } = Route.useRouteContext();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Una vez al abrir: guardar dos veces lo mismo no duplica (ADR 0008).
  const [operationId] = useState(() => crypto.randomUUID());
  const [initial] = useState(() =>
    emptyOperationForm(today(), "", "", { kind: "expense", description: debt.description }),
  );
  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/debts", replace: true });
  };
  return (
    // Sin el hueco de la barra: abajo va «Pagar», fijo.
    <Screen className="pb-0">
      <ScreenHeader {...HEADER} />
      <OperationForm
        operationId={operationId}
        initial={initial}
        debt={debt}
        rememberFor={session.user.id}
        onSaved={close}
      />
    </Screen>
  );
}
