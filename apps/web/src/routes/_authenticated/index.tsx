import { createFileRoute, Link } from "@tanstack/react-router";

import { Button, buttonVariants } from "@/components/ui/button";
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
        <h1 className="text-title">{greeting(member)}</h1>
        <p className="text-body text-ink-muted">{session.user.email}</p>
      </div>
      <TodayTotals />
      {/* Al cerrar sesión, main.tsx vacía la caché y la ruta protegida manda al login. */}
      <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
        Cerrar sesión
      </Button>
      <Link to="/gallery" className={buttonVariants({ variant: "link" })}>
        Galería de componentes
      </Link>
      <p className="text-center text-caption text-ink-muted">Versión {__APP_VERSION__}</p>
    </main>
  );
}

// Provisional de M1: la prueba de que el teléfono ve los datos importados con la
// sesión de quien lo usa. M2 la sustituye por una tarjeta por moneda.
function TodayTotals() {
  const totals = useCurrencyTotals();
  if (totals.isPending) return <p className="text-body text-ink-muted">Cargando saldos…</p>;
  if (totals.isError)
    return <p className="text-body text-destructive">No se pudieron cargar los saldos.</p>;
  if (totals.data.length === 0) {
    return <p className="text-body text-ink-muted">Todavía no hay datos importados.</p>;
  }

  return (
    <section aria-label="Lo que hay hoy" className="flex flex-col gap-1">
      <p className="text-body text-ink-muted">Hoy, sin «Otro»</p>
      {totals.data.map((total) => (
        <p key={total.currency} className="text-title">
          {formatMoney(total.ownCents, total.currency)}
        </p>
      ))}
      <p className="text-caption text-ink-muted">
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
