import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { DebtForm } from "@/features/debts/debt-form";
import { emptyDebtForm, MAX_INSTALLMENTS } from "@/features/debts/debt-form-schema";

export const Route = createFileRoute("/_authenticated/debts/new")({
  component: NewDebtPage,
});

// Agregar una deuda, o varias cuotas de una vez. Al guardar vuelve a Deudas.
function NewDebtPage() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Uno por cada cuota posible, una sola vez al abrir: guardar dos veces no duplica.
  const [ids] = useState(() => Array.from({ length: MAX_INSTALLMENTS }, () => crypto.randomUUID()));
  const [initial] = useState(() => emptyDebtForm());

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/debts", replace: true });
  };

  return (
    <Screen>
      <ScreenHeader title="Agregar" back={{ to: "/debts" }} backLabel="Volver sin guardar" />
      <DebtForm ids={ids} initial={initial} allowInstallments onSaved={close} />
    </Screen>
  );
}
