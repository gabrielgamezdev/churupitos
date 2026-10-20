import { isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { TabBar } from "@/components/tab-bar";
import { readStoredSession, supabase } from "@/lib/supabase";

// Todo lo que cuelga de aquí exige sesión. Sin ella, al login, recordando adónde
// se quería ir. La sesión vive en el teléfono, así que comprobarla no pide red.
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    // Sin red basta con la sesión guardada: solo sirve para enseñar lo que ya está
    // en el teléfono. `getSession` intentaría renovarla si caducó, y sin red se
    // quedaría segundos reintentando con la pantalla en blanco.
    const stored = navigator.onLine ? null : readStoredSession();
    if (stored) return { session: stored };

    const { data, error } = await supabase.auth.getSession();
    if (data.session) return { session: data.session };

    // Con red a medias (`onLine` dice que hay, pero no responde nada), igual.
    const fallback = isAuthRetryableFetchError(error) ? readStoredSession() : null;
    if (fallback) return { session: fallback };

    // Volver al inicio es lo de siempre: solo se recuerda cualquier otro destino.
    const search = location.href === "/" ? {} : { redirect: location.href };
    throw redirect({ to: "/login", search });
  },
  component: AuthenticatedLayout,
});

// Con sesión, cada pantalla lleva debajo la barra de secciones.
function AuthenticatedLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  );
}
