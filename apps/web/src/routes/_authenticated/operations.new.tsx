import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { OperationForm } from "@/features/operations/operation-form";
import { emptyOperationForm } from "@/features/operations/operation-form-schema";
import type { Currency } from "@/lib/money";
import { today } from "@/lib/months";

type NewOperationSearch = {
  // Lo que ya viene elegido: la cuenta o el sobre desde los que se abrió.
  account?: string;
  envelope?: string;
  // Lo que ya viene escrito: el pago de una deuda, desde Deudas.
  kind?: "expense" | "income";
  amount?: number;
  description?: string;
  currency?: Currency;
};

export const Route = createFileRoute("/_authenticated/operations/new")({
  // Funciones simples, no un esquema: lo de aquí va al bundle principal (TRAMPAS).
  validateSearch: (search: Record<string, unknown>): NewOperationSearch => ({
    account: typeof search.account === "string" ? search.account : undefined,
    envelope: typeof search.envelope === "string" ? search.envelope : undefined,
    kind: search.kind === "expense" || search.kind === "income" ? search.kind : undefined,
    amount:
      typeof search.amount === "number" && Number.isSafeInteger(search.amount) && search.amount > 0
        ? search.amount
        : undefined,
    description: typeof search.description === "string" ? search.description : undefined,
    currency: search.currency === "VES" || search.currency === "USD" ? search.currency : undefined,
  }),
  component: NewOperationPage,
});

// Registrar: al guardar vuelve a la pantalla desde la que se abrió, que ya enseña el
// movimiento nuevo.
function NewOperationPage() {
  const { account, envelope, kind, amount, description, currency } = Route.useSearch();
  const { session } = Route.useRouteContext();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Una vez al abrir: es lo que hace que guardar dos veces no duplique (ADR 0008).
  const [operationId] = useState(() => crypto.randomUUID());
  const [initial] = useState(() =>
    emptyOperationForm(today(), account, envelope, { kind, amountCents: amount, description }),
  );

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/", replace: true });
  };

  return (
    // Sin el hueco de la barra: abajo va «Guardar», fijo.
    <Screen className="pb-0">
      <ScreenHeader title="Registrar" back={{ to: "/" }} backLabel="Volver sin guardar" />
      <OperationForm
        operationId={operationId}
        initial={initial}
        onlyCurrency={currency}
        rememberFor={session.user.id}
        onSaved={close}
      />
    </Screen>
  );
}
