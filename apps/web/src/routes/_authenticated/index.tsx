import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useCurrencyTotals } from "@/features/balances/use-currency-totals";
import { useCurrentMember } from "@/features/household/use-current-member";
import { formatMoney } from "@/lib/money";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

// Inicio provisional de M0: demuestra el recorrido entero, de la sesión a un dato
// protegido con RLS. El inicio de verdad (una tarjeta por moneda) llega en M2.
function HomePage() {
  const { session } = Route.useRouteContext();
  const member = useCurrentMember(session.user.id);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{greeting(member)}</h1>
        <p className="text-sm text-muted-foreground">{session.user.email}</p>
      </div>
      <TodayTotals />
      {/* Al cerrar sesión, main.tsx vacía la caché y la ruta protegida manda al login. */}
      <Button variant="outline" className="h-11" onClick={() => void supabase.auth.signOut()}>
        Cerrar sesión
      </Button>
      <p className="text-center text-xs text-muted-foreground">Versión {__APP_VERSION__}</p>
    </main>
  );
}

// Provisional de M1: la prueba de que el teléfono ve los datos importados con la
// sesión de quien lo usa. M2 la sustituye por una tarjeta por moneda.
function TodayTotals() {
  const totals = useCurrencyTotals();
  if (totals.isPending) return <p className="text-sm text-muted-foreground">Cargando saldos…</p>;
  if (totals.isError)
    return <p className="text-sm text-destructive">No se pudieron cargar los saldos.</p>;
  if (totals.data.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay datos importados.</p>;
  }

  return (
    <section aria-label="Lo que hay hoy" className="flex flex-col gap-1">
      <p className="text-sm text-muted-foreground">Hoy, sin «Otro»</p>
      {totals.data.map((total) => (
        <p key={total.currency} className="text-xl font-semibold tabular-nums">
          {formatMoney(total.ownCents, total.currency)}
        </p>
      ))}
      <p className="text-xs text-muted-foreground tabular-nums">
        Con «Otro»:{" "}
        {totals.data.map((total) => formatMoney(total.totalCents, total.currency)).join(" · ")}
      </p>
    </section>
  );
}

function greeting(member: ReturnType<typeof useCurrentMember>): string {
  if (member.isPending) return "Cargando…";
  if (member.isError) return "No se pudo cargar tu nombre.";
  if (!member.data) return "Tu cuenta no pertenece a este hogar.";
  return `Hola, ${member.data.display_name}`;
}
