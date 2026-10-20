import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { OperationForm } from "@/features/operations/operation-form";
import { emptyOperationForm } from "@/features/operations/operation-form-schema";
import { today } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/operations/new")({
  // Lo que ya viene elegido: la cuenta o el sobre desde los que se abrió.
  validateSearch: (search: Record<string, unknown>): { account?: string; envelope?: string } => ({
    account: typeof search.account === "string" ? search.account : undefined,
    envelope: typeof search.envelope === "string" ? search.envelope : undefined,
  }),
  component: NewOperationPage,
});

// Registrar: al guardar vuelve a la pantalla desde la que se abrió, que ya enseña el
// movimiento nuevo.
function NewOperationPage() {
  const { account, envelope } = Route.useSearch();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Una vez al abrir: es lo que hace que guardar dos veces no duplique (ADR 0008).
  const [operationId] = useState(() => crypto.randomUUID());
  const [initial] = useState(() => emptyOperationForm(today(), account, envelope));

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/", replace: true });
  };

  return (
    <Screen>
      <ScreenHeader title="Registrar" back={{ to: "/" }} backLabel="Volver sin guardar" />
      <OperationForm operationId={operationId} initial={initial} onSaved={close} />
    </Screen>
  );
}
