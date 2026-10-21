import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { List, ListRow } from "@/components/list";
import { Screen } from "@/components/screen";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentMember } from "@/features/household/use-current-member";
import { supabase } from "@/lib/supabase";
import { useOnline } from "@/lib/use-online";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

// Ajustes: lo que no es dinero. Elegir el tema llegará aquí (docs/ESTADO.md).
function SettingsPage() {
  const { session } = Route.useRouteContext();
  const member = useCurrentMember(session.user.id);
  const online = useOnline();

  return (
    <Screen>
      <ScreenHeader title="Ajustes" back={{ to: "/" }} backLabel="Volver a Inicio" />

      <section aria-labelledby="session-title" className="flex flex-col gap-3">
        <h2 id="session-title" className="text-heading">
          Sesión
        </h2>
        <List>
          <ListRow className="flex-col items-start justify-center gap-0.5">
            {member.isPending ? (
              <Skeleton aria-label="Cargando" className="h-4 w-32" />
            ) : (
              <span className="text-body">{member.data?.display_name ?? "Sin nombre"}</span>
            )}
            <span className="text-caption text-ink-muted">{session.user.email}</span>
          </ListRow>
        </List>
        {/* Al cerrar sesión, main.tsx vacía la caché y la ruta protegida manda al login. */}
        <Button variant="outline" disabled={!online} onClick={() => void supabase.auth.signOut()}>
          Cerrar sesión
        </Button>
        {!online && (
          <p className="text-caption text-ink-muted">
            Sin conexión no se podría volver a entrar: cierra la sesión cuando haya red.
          </p>
        )}
      </section>

      <section aria-labelledby="app-title" className="flex flex-col gap-3">
        <h2 id="app-title" className="text-heading">
          La app
        </h2>
        <List>
          <ListRow asChild>
            <Link to="/gallery">
              <span className="text-body">Galería de componentes</span>
              <ChevronRight aria-hidden="true" className="size-5 text-ink-muted" />
            </Link>
          </ListRow>
          <ListRow>
            <span className="text-body">Versión</span>
            <span className="text-body text-ink-muted">{__APP_VERSION__}</span>
          </ListRow>
        </List>
      </section>
    </Screen>
  );
}
