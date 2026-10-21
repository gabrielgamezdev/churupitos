import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { MoveForm } from "@/features/operations/move-form";
import { emptyMoveForm, type Carry } from "@/features/operations/move-form-schema";
import { OperationForm } from "@/features/operations/operation-form";
import { emptyOperationForm } from "@/features/operations/operation-form-schema";
import { amountInputText, parseAmountInput } from "@/lib/amount-input";
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
  // Abrir directo en Mover, con el sobre de destino: «Cubrir» un descubierto (M8).
  mode?: "move";
  toEnvelope?: string;
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
    mode: search.mode === "move" ? "move" : undefined,
    toEnvelope: typeof search.toEnvelope === "string" ? search.toEnvelope : undefined,
  }),
  component: NewOperationPage,
});

// Registrar: al guardar vuelve a la pantalla desde la que se abrió, que ya enseña el
// movimiento nuevo.
function NewOperationPage() {
  const { account, envelope, kind, amount, description, currency, mode, toEnvelope } =
    Route.useSearch();
  const { session } = Route.useRouteContext();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Una vez al abrir: es lo que hace que guardar dos veces no duplique (ADR 0008).
  const [operationId] = useState(() => crypto.randomUUID());
  // Gasto o Ingreso, o Mover (M8). Al pasar de uno a otro se lleva lo ya escrito: el
  // formulario nuevo empieza con eso.
  const [screen, setScreen] = useState<
    | { form: "operation"; initial: ReturnType<typeof emptyOperationForm> }
    | { form: "move"; initial: ReturnType<typeof emptyMoveForm> }
  >(() =>
    mode === "move"
      ? {
          form: "move",
          initial: {
            ...emptyMoveForm({
              amount: amount === undefined ? "" : amountInputText(amount),
              accountId: account ?? "",
              day: today(),
              description: description ?? "",
            }),
            toEnvelope: toEnvelope ?? "",
          },
        }
      : {
          form: "operation",
          initial: emptyOperationForm(today(), account, envelope, {
            kind,
            amountCents: amount,
            description,
          }),
        },
  );
  const toMove = (carry: Carry) => setScreen({ form: "move", initial: emptyMoveForm(carry) });
  const toOperation = (nextKind: "expense" | "income", carry: Carry) =>
    setScreen({
      form: "operation",
      initial: emptyOperationForm(carry.day, carry.accountId, undefined, {
        kind: nextKind,
        amountCents: parseAmountInput(carry.amount) ?? undefined,
        description: carry.description,
      }),
    });

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/", replace: true });
  };

  return (
    // Sin el hueco de la barra: abajo va «Guardar», fijo.
    <Screen className="pb-0">
      <ScreenHeader title="Registrar" back={{ to: "/" }} backLabel="Volver sin guardar" />
      {screen.form === "operation" ? (
        <OperationForm
          // Uno nuevo cada vez que se vuelve, con lo que se trajo.
          key={`operation-${screen.initial.kind}`}
          operationId={operationId}
          initial={screen.initial}
          onlyCurrency={currency}
          rememberFor={session.user.id}
          // Pagar una deuda es un gasto o un cobro, nunca un movimiento.
          onMove={currency ? undefined : toMove}
          onSaved={close}
        />
      ) : (
        <MoveForm
          operationId={operationId}
          initial={screen.initial}
          rememberFor={session.user.id}
          onKind={toOperation}
          onSaved={close}
        />
      )}
    </Screen>
  );
}
