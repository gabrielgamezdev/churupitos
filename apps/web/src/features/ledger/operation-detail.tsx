import { useQuery } from "@tanstack/react-query";

import { EnvelopeChip } from "@/components/envelope-chip";
import { Money } from "@/components/money";
import { MissingData } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AccountBalance } from "@/features/balances/use-account-balances";
import type { Envelope } from "@/features/envelopes/queries";

import { operationLabel } from "./operation-label";
import { operationQuery, type OperationDetail as Operation } from "./queries";

interface OperationDetailProps {
  operationId: string;
  accountById: Record<string, AccountBalance>;
  envelopeById: Record<string, Envelope>;
}

// La operación entera de un cobro del presupuesto: se pide al desplegarlo. Los libros la
// abren en una hoja (`OperationSheet`).
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

// La operación desplegada en su fila: qué es, quién la registró y sus asientos.
export function OperationEntries({ operation, accountById, envelopeById }: OperationEntriesProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-sunken p-3">
      <p className="text-label text-ink-muted">
        {operationLabel(operation)}
        {operation.fromApp &&
          (operation.authorName
            ? ` · registrado por ${operation.authorName}`
            : " · registrado en la app")}
      </p>
      <EntryLines
        entries={operation.entries}
        accountById={accountById}
        envelopeById={envelopeById}
      />
    </div>
  );
}

interface EntryLinesProps {
  entries: Operation["entries"];
  accountById: Record<string, Pick<AccountBalance, "name" | "currency">>;
  envelopeById: Record<string, Envelope>;
}

// Todos los asientos de la operación: de qué cuenta y de qué sobre sale o entra cada
// importe. Un cambio de divisa lleva las dos monedas.
export function EntryLines({ entries, accountById, envelopeById }: EntryLinesProps) {
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
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
              <span className="flex shrink-0 flex-col items-end">
                <Money
                  cents={entry.amountCents}
                  currency={account.currency}
                  kind="movement"
                  className="text-amount-small"
                />
                {/* Lo que se decidió en dólares, como el «$N de…» del Excel (R9). La
                      caché de antes no lo trae: sin él, solo el importe. */}
                {entry.usdValueCents != null && (
                  <Money
                    cents={entry.usdValueCents}
                    currency="USD"
                    className="text-amount-small text-ink-muted"
                  />
                )}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
