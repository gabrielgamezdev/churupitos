import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { List, ListRow } from "@/components/list";
import { EmptyState, MissingData } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import { envelopesQuery } from "@/features/envelopes/queries";
import { today } from "@/lib/months";

import { OperationSheet } from "./operation-sheet";
import { OperationRow } from "./operation-row";
import { recentOperationsQuery } from "./queries";

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
          <OperationRow
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
      <div className="flex items-center justify-between gap-2">
        <h2 id="recent-title" className="text-heading">
          Últimos registrados
        </h2>
        <Link to="/movements" className="text-body text-brand">
          Ver todos
        </Link>
      </div>
      {content}
      <OperationSheet operationId={openOperation} onClose={() => setOpenOperation(null)} />
    </section>
  );
}
