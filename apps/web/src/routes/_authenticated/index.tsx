import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PullToRefresh } from "@/components/pull-to-refresh";
import { EmptyState, ErrorState, OfflineBanner } from "@/components/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CurrencyCard, CurrencyCardSkeleton } from "@/features/balances/currency-card";
import { useAccountBalances } from "@/features/balances/use-account-balances";
import { useCurrencyTotals } from "@/features/balances/use-currency-totals";
import { useCurrentMember } from "@/features/household/use-current-member";
import { supabase } from "@/lib/supabase";
import { useOnline } from "@/lib/use-online";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

// El inicio: el saludo y lo que hay hoy en cada moneda. Sin cabecera de pantalla:
// es la primera, y no hay adónde volver.
function HomePage() {
  const queryClient = useQueryClient();

  return (
    <PullToRefresh onRefresh={() => queryClient.refetchQueries({ type: "active" })}>
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <Greeting />
        <TodayByCurrency />
        <footer className="mt-auto flex flex-col items-center gap-2 pt-6">
          {/* Al cerrar sesión, main.tsx vacía la caché y la ruta protegida manda al login. */}
          <Button variant="ghost" onClick={() => void supabase.auth.signOut()}>
            Cerrar sesión
          </Button>
          <Link to="/gallery" className={buttonVariants({ variant: "link" })}>
            Galería de componentes
          </Link>
          <p className="text-caption text-ink-muted">Versión {__APP_VERSION__}</p>
        </footer>
      </main>
    </PullToRefresh>
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
  return <h1 className="text-title">Hola{member.data ? `, ${member.data.display_name}` : ""}</h1>;
}

// Una tarjeta por moneda: lo del hogar, el total con «Otro» y cuántas cuentas hay.
function TodayByCurrency() {
  const totals = useCurrencyTotals();
  const accounts = useAccountBalances();
  const online = useOnline();

  if (!totals.data || !accounts.data) {
    if (totals.isError || accounts.isError) {
      return (
        <ErrorState
          message="No se pudieron cargar los saldos."
          onRetry={() => void Promise.all([totals.refetch(), accounts.refetch()])}
        />
      );
    }
    // Sin red y sin nada guardado todavía, esperar no sirve de nada.
    if (!online) return <EmptyState>Sin conexión, y todavía no hay datos guardados.</EmptyState>;
    return (
      <div className="flex flex-col gap-3">
        <CurrencyCardSkeleton />
        <CurrencyCardSkeleton />
      </div>
    );
  }

  if (totals.data.length === 0) {
    return <EmptyState>Todavía no hay datos importados.</EmptyState>;
  }

  // Lo que se ve es tan viejo como la más vieja de las dos consultas.
  const updatedAt = new Date(Math.min(totals.dataUpdatedAt, accounts.dataUpdatedAt));
  const failed = totals.isError || accounts.isError;

  return (
    <section aria-label="Lo que hay hoy" className="flex flex-col gap-3">
      {!online && <OfflineBanner updatedAt={updatedAt} />}
      {online && failed && <OfflineBanner updatedAt={updatedAt} reason="failed" />}
      {totals.data.map((total) => (
        <CurrencyCard
          key={total.currency}
          currency={total.currency}
          ownCents={total.ownCents}
          totalCents={total.totalCents}
          thirdPartyCents={total.thirdPartyCents}
          accountCount={accounts.data.filter((a) => a.currency === total.currency).length}
        />
      ))}
    </section>
  );
}
