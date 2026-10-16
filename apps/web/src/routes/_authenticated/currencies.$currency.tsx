import { createFileRoute } from "@tanstack/react-router";

import { List } from "@/components/list";
import { Money } from "@/components/money";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { AccountRow, AccountRowSkeleton } from "@/features/balances/account-row";
import { currencyDetails } from "@/features/balances/currency-summary";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import { useCurrencyTotals } from "@/features/balances/use-currency-totals";
import { CURRENCY_NAMES, currencyFromSlug, type Currency } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/currencies/$currency")({
  component: CurrencyPage,
});

const BACK = { back: { to: "/" }, backLabel: "Volver al inicio" } as const;

function CurrencyPage() {
  const currency = currencyFromSlug(Route.useParams().currency);
  if (!currency) {
    return (
      <Screen>
        <ScreenHeader title="Moneda" {...BACK} />
        <EmptyState>Esa moneda no existe.</EmptyState>
      </Screen>
    );
  }
  return <CurrencyAccounts currency={currency} />;
}

// Una moneda: lo que hay hoy y sus cuentas, en el orden de las hojas del Excel.
function CurrencyAccounts({ currency }: { currency: Currency }) {
  const totals = useCurrencyTotals();
  const accounts = useAccountBalances();
  const queries = [totals, accounts];

  const total = totals.data?.find((row) => row.currency === currency);
  const rows = accounts.data?.filter((row) => row.currency === currency);
  const loaded = totals.data !== undefined && accounts.data !== undefined;

  return (
    <Screen>
      <ScreenHeader title={CURRENCY_NAMES[currency]} {...BACK}>
        {total && rows ? (
          <>
            <Money cents={total.ownCents} currency={currency} className="text-display-amount" />
            <p className="text-caption text-ink-muted">
              {currencyDetails(currency, total.totalCents, total.thirdPartyCents, rows.length)}
            </p>
          </>
        ) : null}
      </ScreenHeader>

      {total && rows ? (
        <section aria-labelledby="accounts-title" className="flex flex-col gap-3">
          <StaleDataBanner queries={queries} />
          <h2 id="accounts-title" className="text-heading">
            Cuentas
          </h2>
          <List>
            {rows.map((row) => (
              <AccountRow
                key={row.accountId}
                accountId={row.accountId}
                name={row.name}
                currency={currency}
                balanceCents={row.balanceCents}
                thirdPartyCents={row.thirdPartyCents}
              />
            ))}
          </List>
        </section>
      ) : loaded ? (
        <EmptyState>Todavía no hay datos importados.</EmptyState>
      ) : (
        <MissingData
          queries={queries}
          errorMessage="No se pudieron cargar las cuentas."
          skeleton={
            <List aria-hidden="true">
              <AccountRowSkeleton />
              <AccountRowSkeleton />
              <AccountRowSkeleton />
            </List>
          }
        />
      )}
    </Screen>
  );
}
