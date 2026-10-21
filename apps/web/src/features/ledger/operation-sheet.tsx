import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Money } from "@/components/money";
import { MissingData } from "@/components/states";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances, type AccountBalance } from "@/features/balances/use-account-balances";
import { envelopesQuery, type Envelope } from "@/features/envelopes/queries";
import { isAppKind } from "@/features/operations/app-kinds";
import { OperationActions } from "@/features/operations/operation-actions";
import { dayMonthLabel, registeredAtLabel } from "@/lib/months";

import { EntryLines } from "./operation-detail";
import { operationLabel } from "./operation-label";
import { summarizeOperation } from "./operation-summary";
import { operationQuery, type OperationDetail } from "./queries";

interface OperationSheetProps {
  // La operación que se mira; sin ninguna, la hoja está cerrada.
  operationId: string | null;
  onClose: () => void;
}

// Un movimiento entero en una hoja, desde cualquier lista: qué es, cuánto, de qué
// cuentas y sobres, quién lo registró, y corregirlo o borrarlo (M7).
export function OperationSheet({ operationId, onClose }: OperationSheetProps) {
  // Se queda con la última mientras la hoja baja: si no, se vaciaría al cerrarse.
  const [shownId, setShownId] = useState(operationId);
  if (operationId !== null && operationId !== shownId) setShownId(operationId);

  return (
    <Sheet open={operationId !== null} onOpenChange={(open) => !open && onClose()}>
      {shownId && <LoadedOperation operationId={shownId} onClose={onClose} />}
    </Sheet>
  );
}

function LoadedOperation({ operationId, onClose }: { operationId: string; onClose: () => void }) {
  const operation = useQuery(operationQuery(operationId));
  const accounts = useAccountBalances();
  const envelopes = useQuery(envelopesQuery);
  const accountById = useMemo(
    () => Object.fromEntries((accounts.data ?? []).map((row) => [row.accountId, row])),
    [accounts.data],
  );
  const envelopeById = useMemo(
    () => Object.fromEntries((envelopes.data ?? []).map((envelope) => [envelope.id, envelope])),
    [envelopes.data],
  );

  if (!operation.data || !accounts.data || !envelopes.data) {
    return (
      <SheetContent title="Movimiento">
        <MissingData
          queries={[operation, accounts, envelopes]}
          errorMessage="No se pudo cargar el movimiento."
          skeleton={<Skeleton aria-label="Cargando" className="h-24 w-full" />}
        />
      </SheetContent>
    );
  }
  const { fromApp, kind } = operation.data;
  return (
    <OperationSheetContent
      operation={operation.data}
      accountById={accountById}
      envelopeById={envelopeById}
      // Lo registrado en la app se corrige o se borra; lo importado, no (ADR 0008).
      actions={
        fromApp && isAppKind(kind) ? (
          <OperationActions
            operationId={operationId}
            kind={kind}
            description={operation.data.description}
            onDeleted={onClose}
          />
        ) : null
      }
    />
  );
}

interface OperationSheetContentProps {
  operation: OperationDetail;
  accountById: Record<string, Pick<AccountBalance, "name" | "currency">>;
  envelopeById: Record<string, Envelope>;
  actions?: React.ReactNode;
}

// Lo que enseña la hoja, sin consultas: la galería lo pinta con datos inventados.
export function OperationSheetContent({
  operation,
  accountById,
  envelopeById,
  actions,
}: OperationSheetContentProps) {
  // La cifra grande: lo que entró o salió, o, en algo que se mueve sin cambiar el total
  // (entre sobres, un traspaso), cuánto pasó, sin signo. Un ajuste no la lleva: lo explican
  // sus asientos.
  const { totals } =
    operation.kind === "adjustment"
      ? { totals: [] }
      : summarizeOperation(operation.entries, (accountId) => accountById[accountId]?.currency);

  return (
    <SheetContent
      eyebrow={`${operationLabel(operation)} · ${dayMonthLabel(operation.day)}`}
      title={operation.description || "Sin concepto"}
    >
      {totals.map(({ currency, cents, movedCents }) => (
        <Money
          key={currency}
          cents={cents === 0 ? movedCents : cents}
          currency={currency}
          kind={cents === 0 ? "balance" : "movement"}
          className="text-display-amount"
        />
      ))}
      <div className="rounded-md bg-surface-sunken p-3">
        <EntryLines
          entries={operation.entries}
          accountById={accountById}
          envelopeById={envelopeById}
        />
      </div>
      <p className="text-caption text-ink-muted">
        {operation.fromApp
          ? `Registrado por ${operation.authorName ?? "alguien del hogar"}${
              // Sin punto al final: la hora ya acaba en «p. m.».
              operation.registeredAt ? ` el ${registeredAtLabel(operation.registeredAt)}` : ""
            }`
          : "Viene del Excel: hasta el corte se corrige allí."}
      </p>
      {actions}
    </SheetContent>
  );
}
