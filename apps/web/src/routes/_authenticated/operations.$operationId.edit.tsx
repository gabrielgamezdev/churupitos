import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { operationQuery, type OperationDetail } from "@/features/ledger/queries";
import { budgetLinesQuery, expectedIncomeQuery, type BudgetLine } from "@/features/budget/queries";
import { isAppKind, isMoveKind } from "@/features/operations/app-kinds";
import { MoveForm } from "@/features/operations/move-form";
import { moveFormValues } from "@/features/operations/move-form-schema";
import { OperationForm } from "@/features/operations/operation-form";
import { operationFormValues } from "@/features/operations/operation-form-schema";
import type { SaveOperationArgs } from "@/features/operations/save";
import { ReceiveForm, type IncomeToReceive } from "@/features/receipts/receive-form";
import { receiveFormValues } from "@/features/receipts/receive-form-schema";
import type { SaveReceiptArgs } from "@/features/receipts/save";

export const Route = createFileRoute("/_authenticated/operations/$operationId/edit")({
  component: EditOperationPage,
});

const HEADER = { title: "Corregir", back: { to: "/" }, backLabel: "Volver sin guardar" } as const;

// Corregir: el mismo formulario de Registrar (o de Mover), con la operación como estaba.
// Guardar la reemplaza entera (ADR 0008); al terminar vuelve al libro del que salió.
function EditOperationPage() {
  const { operationId } = Route.useParams();
  const operation = useQuery(operationQuery(operationId));

  if (!operation.data) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <MissingData
          queries={[operation]}
          errorMessage="No se pudo cargar el movimiento."
          skeleton={<Skeleton aria-label="Cargando" className="h-64 w-full" />}
        />
      </Screen>
    );
  }
  const { fromApp, kind } = operation.data;
  if (!fromApp || !isAppKind(kind)) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <EmptyState className="rounded-lg bg-surface-raised">
          {fromApp
            ? "Este movimiento todavía no se corrige desde la app."
            : "Lo importado del Excel no se corrige hasta el corte."}
        </EmptyState>
      </Screen>
    );
  }
  if (operation.data.incomeId) {
    return (
      <EditReceipt
        operationId={operationId}
        incomeId={operation.data.incomeId}
        operation={operation.data}
      />
    );
  }
  return <EditForm operationId={operationId} operation={operation.data} />;
}

// Un cobro se corrige en Cobrar: con su ingreso, el plan de su mes y el reparto como estaba.
function EditReceipt({
  operationId,
  incomeId,
  operation,
}: {
  operationId: string;
  incomeId: string;
  operation: OperationDetail;
}) {
  const income = useQuery(expectedIncomeQuery(incomeId));
  const plan = useQuery({
    ...budgetLinesQuery(income.data?.month ?? ""),
    enabled: income.data !== undefined,
  });
  if (!income.data || !plan.data) {
    return (
      <Screen>
        <ScreenHeader {...HEADER} />
        <MissingData
          queries={[income, plan]}
          errorMessage="No se pudo cargar el cobro."
          skeleton={<Skeleton aria-label="Cargando" className="h-64 w-full" />}
        />
      </Screen>
    );
  }
  return (
    <ReceiptForm
      operationId={operationId}
      income={income.data}
      plan={plan.data}
      operation={operation}
    />
  );
}

function ReceiptForm({
  operationId,
  income,
  plan,
  operation,
}: {
  operationId: string;
  income: IncomeToReceive;
  plan: BudgetLine[];
  operation: OperationDetail;
}) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Una vez, al abrir: lo que llegue después de la base no pisa lo que se está escribiendo.
  const [initial] = useState(() => receiveFormValues(operation));
  // Como estaba al abrir: lo que «Deshacer» vuelve a guardar.
  const [previous] = useState((): SaveReceiptArgs => ({
    id: operationId,
    incomeId: income.id,
    day: operation.day,
    description: operation.description,
    entries: operation.entries.map((entry) => ({
      account_id: entry.accountId,
      envelope_id: entry.envelopeId,
      amount_cents: entry.amountCents,
      is_fee: entry.isFee,
      description: entry.description,
      usd_value_cents: entry.usdValueCents,
    })),
  }));
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
        previous={previous}
        onSaved={close}
      />
    </Screen>
  );
}

function EditForm({ operationId, operation }: { operationId: string; operation: OperationDetail }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  // Una vez, al abrir: lo que llegue después de la base no pisa lo que se está escribiendo.
  const [initial] = useState(() =>
    isMoveKind(operation.kind) ? null : operationFormValues(operation),
  );
  const [moveInitial] = useState(() =>
    isMoveKind(operation.kind) ? moveFormValues(operation) : null,
  );
  // Como estaba al abrir: lo que «Deshacer» vuelve a guardar.
  const [previous] = useState((): SaveOperationArgs => ({
    id: operationId,
    // La página ya comprobó que la app sabe registrarla.
    kind: isAppKind(operation.kind) ? operation.kind : "expense",
    day: operation.day,
    description: operation.description,
    entries: operation.entries.map((entry) => ({
      account_id: entry.accountId,
      envelope_id: entry.envelopeId,
      amount_cents: entry.amountCents,
      is_fee: entry.isFee,
      description: entry.description,
    })),
  }));

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/", replace: true });
  };

  return (
    // Sin el hueco de la barra: abajo va «Guardar», fijo.
    <Screen className="pb-0">
      <ScreenHeader {...HEADER} />
      {moveInitial ? (
        <MoveForm
          operationId={operationId}
          initial={moveInitial}
          previous={previous}
          onSaved={close}
        />
      ) : initial ? (
        <OperationForm
          operationId={operationId}
          initial={initial}
          previous={previous}
          onSaved={close}
        />
      ) : (
        // Un movimiento de varias partes: la app solo registra los de una salida y una
        // entrada.
        <EmptyState className="rounded-lg bg-surface-raised">
          Este movimiento tiene varias partes: se corrige en el Excel.
        </EmptyState>
      )}
    </Screen>
  );
}
