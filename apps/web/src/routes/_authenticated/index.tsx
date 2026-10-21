import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";

import { Screen } from "@/components/screen";
import { EmptyState, MissingData, StaleDataBanner } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyCard, CurrencyCardSkeleton } from "@/features/balances/currency-card";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import { useCurrencyTotals } from "@/features/balances/use-currency-totals";
import { useCurrentMember } from "@/features/household/use-current-member";
import { currencySlug } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

// El inicio: el saludo, Ajustes y lo que hay hoy en cada moneda. Sin cabecera de
// pantalla: es la primera, y no hay adónde volver.
function HomePage() {
  return (
    <Screen className="pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Greeting />
      <TodayByCurrency />
    </Screen>
  );
}

function Greeting() {
  const { session } = Route.useRouteContext();
  const member = useCurrentMember(session.user.id);

  if (member.isPending) return <Skeleton aria-label="Cargando" className="h-[1.625rem] w-40" />;
  if (member.data === null) {
    return <p className="text-body">Tu cuenta no pertenece a este hogar.</p>;
  }
  // Sin el nombre (no cargó), el saludo se queda en «Hola».
  return (
    <div className="flex items-center justify-between gap-2">
      <h1 className="text-title">Hola{member.data ? `, ${member.data.display_name}` : ""}</h1>
      {/* Ajustes no tiene pestaña: se usa poco, y la barra es para lo de cada día. */}
      <Link
        to="/settings"
        aria-label="Ajustes"
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <Settings aria-hidden="true" />
      </Link>
    </div>
  );
}

// Una tarjeta por moneda, que lleva a sus cuentas: lo del hogar, el total con «Otro»
// y cuántas cuentas hay.
function TodayByCurrency() {
  const totals = useCurrencyTotals();
  const accounts = useAccountBalances();
  const queries = [totals, accounts];

  if (!totals.data || !accounts.data) {
    return (
      <MissingData
        queries={queries}
        errorMessage="No se pudieron cargar los saldos."
        skeleton={
          <div className="flex flex-col gap-3">
            <CurrencyCardSkeleton />
            <CurrencyCardSkeleton />
          </div>
        }
      />
    );
  }

  if (totals.data.length === 0) {
    return <EmptyState>Todavía no hay datos importados.</EmptyState>;
  }

  return (
    <section aria-label="Lo que hay hoy" className="flex flex-col gap-3">
      <StaleDataBanner queries={queries} />
      {totals.data.map((total) => (
        <Link
          key={total.currency}
          to="/currencies/$currency"
          params={{ currency: currencySlug(total.currency) }}
          className="rounded-lg transition-transform active:scale-[0.99]"
        >
          <CurrencyCard
            currency={total.currency}
            ownCents={total.ownCents}
            totalCents={total.totalCents}
            thirdPartyCents={total.thirdPartyCents}
            accountCount={accounts.data.filter((a) => a.currency === total.currency).length}
            tappable
          />
        </Link>
      ))}
    </section>
  );
}
