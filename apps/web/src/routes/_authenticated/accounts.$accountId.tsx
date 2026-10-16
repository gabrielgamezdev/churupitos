import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { List } from "@/components/list";
import { Money } from "@/components/money";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { EnvelopeSplit } from "@/features/accounts/envelope-split";
import { LedgerList } from "@/features/accounts/ledger-list";
import { envelopeRows } from "@/features/accounts/ledger-view";
import { MonthPicker } from "@/features/accounts/month-picker";
import { OperationDetail } from "@/features/accounts/operation-detail";
import {
  accountCellsQuery,
  balancesAtQuery,
  envelopesQuery,
  ledgerQuery,
} from "@/features/accounts/queries";
import { AccountRowSkeleton } from "@/features/balances/account-row";
import { useAccountBalances, type AccountBalance } from "@/features/balances/use-account-balances";
import { CURRENCY_NAMES, currencySlug, formatMoney } from "@/lib/money";
import { addMonths, isMonth, lastDay, monthName, monthOf, today } from "@/lib/months";

export const Route = createFileRoute("/_authenticated/accounts/$accountId")({
  // Una función y no un esquema: lo que no es el componente va en el bundle principal
  // (TRAMPAS). Sin mes, o con uno que no lo es, el mes en curso.
  validateSearch: (search: Record<string, unknown>): { month?: string } => ({
    month: isMonth(search.month) ? search.month : undefined,
  }),
  component: AccountPage,
});

const HOME = { back: { to: "/" }, backLabel: "Volver al inicio" } as const;

function AccountPage() {
  const { accountId } = Route.useParams();
  const accounts = useAccountBalances();
  const account = accounts.data?.find((row) => row.accountId === accountId);

  if (!accounts.data) {
    return (
      <Screen>
        <ScreenHeader title="Cuenta" {...HOME} />
        <MissingData
          queries={[accounts]}
          errorMessage="No se pudo cargar la cuenta."
          skeleton={<Skeleton aria-label="Cargando" className="h-9 w-48" />}
        />
      </Screen>
    );
  }
  if (!account) {
    return (
      <Screen>
        <ScreenHeader title="Cuenta" {...HOME} />
        <EmptyState>Esa cuenta no existe.</EmptyState>
      </Screen>
    );
  }
  return <AccountScreen account={account} accounts={accounts.data} />;
}

interface AccountScreenProps {
  account: AccountBalance;
  accounts: AccountBalance[];
}

// Una cuenta: su saldo, cuánto hay de cada sobre en ella y su libro, mes a mes.
function AccountScreen({ account, accounts }: AccountScreenProps) {
  const navigate = Route.useNavigate();
  const todayDay = today();
  const currentMonth = monthOf(todayDay);
  const requested = Route.useSearch().month;
  // Un mes por venir no tiene libro: se queda en el de hoy.
  const month = requested && requested < currentMonth ? requested : currentMonth;
  const isCurrent = month === currentMonth;

  const accountsQuery = useAccountBalances();
  const envelopes = useQuery(envelopesQuery);
  const cells = useQuery(accountCellsQuery(account.accountId));
  const ledger = useQuery(ledgerQuery(account.accountId, month));
  // R7: un mes abre con el cierre del anterior. El cierre del mes en curso es el
  // saldo de hoy, que ya está en `account`.
  const opening = useQuery(balancesAtQuery(lastDay(addMonths(month, -1))));
  const closing = useQuery({ ...balancesAtQuery(lastDay(month)), enabled: !isCurrent });

  const envelopeById = useMemo(
    () => Object.fromEntries((envelopes.data ?? []).map((envelope) => [envelope.id, envelope])),
    [envelopes.data],
  );
  const accountById = useMemo(
    () => Object.fromEntries(accounts.map((row) => [row.accountId, row])),
    [accounts],
  );

  const { currency } = account;
  const changeMonth = (next: string) =>
    void navigate({
      search: { month: next === currentMonth ? undefined : next },
      // Cambiar de mes no deja rastro: el atrás de Android sale de la cuenta.
      replace: true,
    });

  return (
    <Screen>
      <ScreenHeader
        title={account.name}
        back={{ to: "/currencies/$currency", params: { currency: currencySlug(currency) } }}
        backLabel={`Volver a ${CURRENCY_NAMES[currency]}`}
      >
        <Money cents={account.balanceCents} currency={currency} className="text-display-amount" />
        <p className="text-caption text-ink-muted">
          {CURRENCY_NAMES[currency]} · saldo de hoy
          {account.thirdPartyCents !== 0 &&
            ` · de los cuales ${formatMoney(account.thirdPartyCents, currency)} son «Otro»`}
        </p>
      </ScreenHeader>

      <StaleDataBanner queries={[accountsQuery, envelopes, cells, ledger]} />

      <section aria-labelledby="envelopes-title" className="flex flex-col gap-3">
        <h2 id="envelopes-title" className="text-heading">
          Sobres de esta cuenta
        </h2>
        {cells.data && envelopes.data ? (
          <EnvelopeSplit currency={currency} rows={envelopeRows(cells.data, envelopes.data)} />
        ) : (
          <MissingData
            queries={[cells, envelopes]}
            errorMessage="No se pudieron cargar los sobres."
            skeleton={<RowsSkeleton />}
          />
        )}
      </section>

      <section aria-labelledby="month-title" className="flex flex-col gap-3">
        <MonthPicker
          month={month}
          isCurrent={isCurrent}
          currency={currency}
          openingCents={opening.data?.[account.accountId]}
          closingCents={isCurrent ? account.balanceCents : closing.data?.[account.accountId]}
          onChange={changeMonth}
        />
        {ledger.data && envelopes.data ? (
          ledger.data.length === 0 ? (
            <EmptyState className="rounded-lg bg-surface-raised">
              Sin movimientos en {monthName(month)}
            </EmptyState>
          ) : (
            <LedgerList
              currency={currency}
              entries={ledger.data}
              envelopeById={envelopeById}
              today={todayDay}
              renderDetail={(entry) => (
                <OperationDetail
                  operationId={entry.operationId}
                  accountById={accountById}
                  envelopeById={envelopeById}
                />
              )}
            />
          )
        ) : (
          <MissingData
            queries={[ledger, envelopes]}
            errorMessage="No se pudo cargar el libro."
            skeleton={<RowsSkeleton />}
          />
        )}
      </section>
    </Screen>
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
