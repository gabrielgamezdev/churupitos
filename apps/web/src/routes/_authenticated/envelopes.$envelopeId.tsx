import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { List } from "@/components/list";
import { Money } from "@/components/money";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountRow, AccountRowSkeleton } from "@/features/balances/account-row";
import { useAccountBalances, type AccountBalance } from "@/features/balances/use-account-balances";
import {
  envelopeAmounts,
  envelopeCellRows,
  envelopeMonthBounds,
} from "@/features/envelopes/envelope-view";
import {
  envelopeBalancesQuery,
  envelopeCellsQuery,
  envelopesQuery,
  type Envelope,
} from "@/features/envelopes/queries";
import { LedgerList } from "@/features/ledger/ledger-list";
import { MonthPicker } from "@/features/ledger/month-picker";
import { OperationSheet } from "@/features/ledger/operation-sheet";
import { envelopeLedgerQuery } from "@/features/ledger/queries";
import { addMonths, isMonth, lastDay, monthName, monthOf, today } from "@/lib/months";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/envelopes/$envelopeId")({
  // Una función y no un esquema: lo que no es el componente va en el bundle principal
  // (TRAMPAS). Sin mes, o con uno que no lo es, el mes en curso.
  validateSearch: (search: Record<string, unknown>): { month?: string } => ({
    month: isMonth(search.month) ? search.month : undefined,
  }),
  component: EnvelopePage,
});

const ENVELOPES = { back: { to: "/envelopes" }, backLabel: "Volver a Sobres" } as const;

function EnvelopePage() {
  const { envelopeId } = Route.useParams();
  const envelopes = useQuery(envelopesQuery);
  const envelope = envelopes.data?.find((row) => row.id === envelopeId);

  if (!envelopes.data) {
    return (
      <Screen>
        <ScreenHeader title="Sobre" {...ENVELOPES} />
        <MissingData
          queries={[envelopes]}
          errorMessage="No se pudo cargar el sobre."
          skeleton={<Skeleton aria-label="Cargando" className="h-9 w-48" />}
        />
      </Screen>
    );
  }
  if (!envelope) {
    return (
      <Screen>
        <ScreenHeader title="Sobre" {...ENVELOPES} />
        <EmptyState>Ese sobre no existe.</EmptyState>
      </Screen>
    );
  }
  return <EnvelopeScreen envelope={envelope} />;
}

// Un sobre: lo que tiene, en qué cuentas está y su libro mes a mes, con los
// movimientos de todas sus cuentas.
function EnvelopeScreen({ envelope }: { envelope: Envelope }) {
  // La operación abierta en su hoja, si hay una.
  const [openOperation, setOpenOperation] = useState<string | null>(null);
  const navigate = Route.useNavigate();
  const todayDay = today();
  const currentMonth = monthOf(todayDay);
  const requested = Route.useSearch().month;
  // Un mes por venir no tiene libro: se queda en el de hoy.
  const month = requested && requested < currentMonth ? requested : currentMonth;
  const isCurrent = month === currentMonth;

  const accounts = useAccountBalances();
  const balances = useQuery(envelopeBalancesQuery());
  const cells = useQuery(envelopeCellsQuery(envelope.id));
  const ledger = useQuery(envelopeLedgerQuery(envelope.id, month));
  // R7: un mes abre con el cierre del anterior. El cierre del mes en curso es lo de hoy.
  const opening = useQuery(envelopeBalancesQuery(lastDay(addMonths(month, -1))));
  const closing = useQuery({ ...envelopeBalancesQuery(lastDay(month)), enabled: !isCurrent });

  const accountById = useMemo(
    () => Object.fromEntries((accounts.data ?? []).map((row) => [row.accountId, row])),
    [accounts.data],
  );
  const amounts = balances.data ? envelopeAmounts(envelope.id, balances.data) : undefined;

  const changeMonth = (next: string) =>
    void navigate({
      search: { month: next === currentMonth ? undefined : next },
      // Cambiar de mes no deja rastro: el atrás de Android sale del sobre.
      replace: true,
    });

  return (
    <Screen>
      <ScreenHeader
        title={envelope.emoji ? `${envelope.emoji} ${envelope.name}` : envelope.name}
        {...ENVELOPES}
      >
        {amounts?.map(({ currency, balanceCents }) => (
          <Money
            key={currency}
            cents={balanceCents}
            currency={currency}
            // Una cifra grande por pantalla; con las dos monedas, las dos más pequeñas.
            className={cn(
              amounts.length === 1 ? "text-display-amount" : "text-title",
              envelope.isThirdParty && balanceCents > 0 && "text-third-party",
            )}
          />
        ))}
        <p className="text-caption text-ink-muted">
          {amounts && amounts.length === 0 ? "Hoy está en cero" : "Lo que tiene hoy"}
          {envelope.isThirdParty && " · no es del hogar"}
        </p>
      </ScreenHeader>

      <StaleDataBanner queries={[accounts, balances, cells, ledger]} />

      <section aria-labelledby="accounts-title" className="flex flex-col gap-3">
        <h2 id="accounts-title" className="text-heading">
          En qué cuentas está
        </h2>
        {cells.data && accounts.data ? (
          <CellList rows={envelopeCellRows(cells.data, accounts.data)} />
        ) : (
          <MissingData
            queries={[cells, accounts]}
            errorMessage="No se pudieron cargar las cuentas del sobre."
            skeleton={<RowsSkeleton />}
          />
        )}
      </section>

      <section aria-labelledby="month-title" className="flex flex-col gap-3">
        <MonthPicker
          month={month}
          isCurrent={isCurrent}
          bounds={envelopeMonthBounds(
            envelope.id,
            opening.data,
            isCurrent ? balances.data : closing.data,
            ledger.data,
          )}
          onChange={changeMonth}
        />
        {ledger.data && accounts.data ? (
          ledger.data.length === 0 ? (
            <EmptyState className="rounded-lg bg-surface-raised">
              Sin movimientos en {monthName(month)}
            </EmptyState>
          ) : (
            <LedgerList
              entries={ledger.data}
              today={todayDay}
              renderContext={(entry) => (
                <span className="text-caption text-ink-muted">
                  {accountById[entry.accountId]?.name ?? "Otra cuenta"}
                </span>
              )}
              onOpen={(entry) => setOpenOperation(entry.operationId)}
            />
          )
        ) : (
          <MissingData
            queries={[ledger, accounts]}
            errorMessage="No se pudo cargar el libro."
            skeleton={<RowsSkeleton />}
          />
        )}
      </section>
      <OperationSheet operationId={openOperation} onClose={() => setOpenOperation(null)} />
    </Screen>
  );
}

// Cada cuenta en la que está el sobre, con lo que tiene en ella; lleva a la cuenta.
function CellList({ rows }: { rows: { account: AccountBalance; balanceCents: number }[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState className="rounded-lg bg-surface-raised">
        No tiene dinero en ninguna cuenta.
      </EmptyState>
    );
  }
  return (
    <List>
      {rows.map(({ account, balanceCents }) => (
        <AccountRow
          key={account.accountId}
          accountId={account.accountId}
          name={account.name}
          currency={account.currency}
          balanceCents={balanceCents}
          thirdPartyCents={0}
        />
      ))}
    </List>
  );
}

function RowsSkeleton() {
  return (
    <List aria-hidden="true">
      <AccountRowSkeleton />
      <AccountRowSkeleton />
      <AccountRowSkeleton />
    </List>
  );
}
