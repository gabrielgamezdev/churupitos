import { createFileRoute, redirect } from "@tanstack/react-router";

import { supabase } from "@/lib/supabase";

// Todo lo que cuelga de aquí exige sesión. Sin ella, al login, recordando adónde
// se quería ir. La sesión vive en el teléfono, así que comprobarla no pide red.
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      // Volver al inicio es lo de siempre: solo se recuerda cualquier otro destino.
      const search = location.href === "/" ? {} : { redirect: location.href };
      throw redirect({ to: "/login", search });
    }
    return { session: data.session };
  },
});
