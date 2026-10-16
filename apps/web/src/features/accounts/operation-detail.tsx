import { useQuery } from "@tanstack/react-query";

import { EnvelopeChip } from "@/components/envelope-chip";
import { Money } from "@/components/money";
import { MissingData } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountBalance } from "@/features/balances/use-account-balances";

import { operationQuery, type Envelope, type OperationDetail as Operation } from "./queries";

// Los tipos de operación con las palabras del Excel (DOMINIO.md, §3).
const KIND_LABELS: Record<string, string> = {
  expense: "Gasto",
  income: "Cobro",
  envelope_transfer: "Entre sobres",
  account_transfer: "Entre cuentas",
  exchange: "Cambio de divisa",
  adjustment: "Ajuste",
};

// Un ajuste no tiene contraparte: su motivo es lo único que lo explica.
const REASON_LABELS: Record<string, string> = {
  opening: "saldo inicial",
  carry_reassignment: "reasignación del arrastre",
  interest: "intereses",
  correction: "corrección",
};

interface OperationDetailProps {
  operationId: string;
  accountById: Record<string, AccountBalance>;
  envelopeById: Record<string, Envelope>;
}

// La operación entera de una fila del libro: se pide al desplegarla.
export function OperationDetail({ operationId, accountById, envelopeById }: OperationDetailProps) {
  const operation = useQuery(operationQuery(operationId));
  if (!operation.data) {
    return (
      <MissingData
        queries={[operation]}
        errorMessage="No se pudo cargar la operación."
        skeleton={<Skeleton aria-label="Cargando" className="h-16 w-full" />}
      />
    );
  }
  return (
    <OperationEntries
      operation={operation.data}
      accountById={accountById}
      envelopeById={envelopeById}
    />
  );
}

interface OperationEntriesProps {
  operation: Operation;
  accountById: Record<string, Pick<AccountBalance, "name" | "currency">>;
  envelopeById: Record<string, Envelope>;
}

// Todos los asientos de la operación: de qué cuenta y de qué sobre sale o entra cada
// importe. Un cambio de divisa lleva las dos monedas.
export function OperationEntries({ operation, accountById, envelopeById }: OperationEntriesProps) {
  const reason = operation.adjustmentReason && REASON_LABELS[operation.adjustmentReason];
  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
      <p className="text-label text-ink-muted">
        {KIND_LABELS[operation.kind] ?? operation.kind}
        {reason ? ` · ${reason}` : ""}
      </p>
      <ul className="flex flex-col gap-2">
        {operation.entries.map((entry) => {
          const account = accountById[entry.accountId];
          const envelope = envelopeById[entry.envelopeId];
          return (
            <li key={entry.id} className="flex items-start justify-between gap-3 text-caption">
              <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                <span>{account?.name ?? "Otra cuenta"}</span>
                <span aria-hidden="true" className="text-ink-muted">
                  ·
                </span>
                {envelope && (
                  <EnvelopeChip
                    name={envelope.name}
                    emoji={envelope.emoji}
                    isThirdParty={envelope.isThirdParty}
                  />
                )}
                {entry.isFee && <Badge>Comisión</Badge>}
              </span>
              {account && (
                <Money
                  cents={entry.amountCents}
                  currency={account.currency}
                  kind="movement"
                  className="text-amount-small"
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
