import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useCurrentMember } from "@/features/household/use-current-member";
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
      {/* Al cerrar sesión, main.tsx vacía la caché y la ruta protegida manda al login. */}
      <Button variant="outline" className="h-11" onClick={() => void supabase.auth.signOut()}>
        Cerrar sesión
      </Button>
    </main>
  );
}

function greeting(member: ReturnType<typeof useCurrentMember>): string {
  if (member.isPending) return "Cargando…";
  if (member.isError) return "No se pudo cargar tu nombre.";
  if (!member.data) return "Tu cuenta no pertenece a este hogar.";
  return `Hola, ${member.data.display_name}`;
}
