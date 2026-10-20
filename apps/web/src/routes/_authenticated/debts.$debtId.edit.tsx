import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { DebtForm } from "@/features/debts/debt-form";
import { debtFormValues } from "@/features/debts/debt-form-schema";
import { debtsQuery, type Debt } from "@/features/debts/queries";

export const Route = createFileRoute("/_authenticated/debts/$debtId/edit")({
  component: EditDebtPage,
});

const HEADER = {
  title: "Corregir",
  back: { to: "/debts" },
  backLabel: "Volver sin guardar",
} as const;

// Corregir una deuda: también las importadas, porque la recarga reemplaza la lista
// entera con la del Excel, que se lleva en paralelo.
function EditDebtPage() {
  const { debtId } = Route.useParams();
  const debts = useQuery(debtsQuery);
  const debt = debts.data?.find((row) => row.id === debtId);

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
  if (!debt) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <EmptyState className="rounded-lg bg-surface-raised">Esa deuda ya no está.</EmptyState>
      </Screen>
    );
  }
  return <EditDebtForm debt={debt} />;
}

function EditDebtForm({ debt }: { debt: Debt }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const [initial] = useState(() => debtFormValues(debt));

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/debts", replace: true });
  };

  return (
    <Screen>
      <ScreenHeader {...HEADER} />
      <DebtForm ids={[debt.id]} initial={initial} allowInstallments={false} onSaved={close} />
    </Screen>
  );
}
