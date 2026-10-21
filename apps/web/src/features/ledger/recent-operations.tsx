import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { EnvelopeChip } from "@/components/envelope-chip";
import { List, ListRow } from "@/components/list";
import { Money } from "@/components/money";
import { EmptyState, MissingData } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances, type AccountBalance } from "@/features/balances/use-account-balances";
import { envelopesQuery, type Envelope } from "@/features/envelopes/queries";
import { dayLabel, today } from "@/lib/months";

import { OperationSheet } from "./operation-sheet";
import { summarizeOperation } from "./operation-summary";
import { recentOperationsQuery, type RecentOperation } from "./queries";

// Lo último que registraron los dos en la app, en Inicio: para ver que quedó y
// corregirlo o borrarlo sin buscarlo en el libro de su cuenta (M7).
export function RecentOperations() {
  const recent = useQuery(recentOperationsQuery);
  const accounts = useAccountBalances();
  const envelopes = useQuery(envelopesQuery);
  const [openOperation, setOpenOperation] = useState<string | null>(null);
  const accountById = useMemo(
    () => Object.fromEntries((accounts.data ?? []).map((row) => [row.accountId, row])),
    [accounts.data],
  );
  const envelopeById = useMemo(
    () => Object.fromEntries((envelopes.data ?? []).map((envelope) => [envelope.id, envelope])),
    [envelopes.data],
  );

  let content: React.ReactNode;
  if (!recent.data || !accounts.data || !envelopes.data) {
    content = (
      <MissingData
        queries={[recent, accounts, envelopes]}
        errorMessage="No se pudo cargar lo último registrado."
        skeleton={
          <List aria-hidden="true">
            {Array.from({ length: 3 }, (_, index) => (
              <ListRow key={index}>
                <Skeleton className="h-10 w-full" />
              </ListRow>
            ))}
          </List>
        }
      />
    );
  } else if (recent.data.length === 0) {
    content = (
      <EmptyState className="rounded-lg bg-surface-raised">
        Lo que registren en la app sale aquí, para corregirlo sin buscarlo.
      </EmptyState>
    );
  } else {
    const todayDay = today();
    content = (
      <List>
        {recent.data.map((operation) => (
          <RecentRow
            key={operation.id}
            operation={operation}
            today={todayDay}
            accountById={accountById}
            envelopeById={envelopeById}
            onOpen={() => setOpenOperation(operation.id)}
          />
        ))}
      </List>
    );
  }

  return (
    <section aria-labelledby="recent-title" className="flex flex-col gap-3">
      <h2 id="recent-title" className="text-heading">
        Últimos registrados
      </h2>
      {content}
      <OperationSheet operationId={openOperation} onClose={() => setOpenOperation(null)} />
    </section>
  );
}

interface RecentRowProps {
  operation: RecentOperation;
  today: string;
  accountById: Record<string, Pick<AccountBalance, "name" | "currency">>;
  envelopeById: Record<string, Envelope>;
  onOpen: () => void;
}

// Una operación: su concepto, sus sobres y su cuenta; a la derecha, cuánto, qué día y
// quién la registró.
export function RecentRow({ operation, today, accountById, envelopeById, onOpen }: RecentRowProps) {
  const { totals, accountIds, envelopeIds } = summarizeOperation(
    operation.entries,
    (accountId) => accountById[accountId]?.currency,
  );
  const envelope = envelopeIds.length === 1 ? envelopeById[envelopeIds[0] ?? ""] : undefined;
  const accountNames = accountIds.map((id) => accountById[id]?.name ?? "Otra cuenta").join(" · ");

  return (
    <ListRow asChild>
      <button type="button" aria-haspopup="dialog" onClick={onOpen} className="w-full text-left">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-body">{operation.description || "Sin concepto"}</span>
          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-caption text-ink-muted">
            {envelope ? (
              <EnvelopeChip
                name={envelope.name}
                emoji={envelope.emoji}
                isThirdParty={envelope.isThirdParty}
                className="text-caption"
              />
            ) : (
              <span>{envelopeIds.length} sobres</span>
            )}
            <span aria-hidden="true">·</span>
            <span>{accountNames}</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          {totals.map(({ currency, cents }) => (
            <Money
              key={currency}
              cents={cents}
              currency={currency}
              kind="movement"
              className="text-amount"
            />
          ))}
          <span className="text-caption text-ink-muted">
            {dayLabel(operation.day, today)}
            {operation.authorName && ` · ${operation.authorName}`}
          </span>
        </span>
      </button>
    </ListRow>
  );
}
