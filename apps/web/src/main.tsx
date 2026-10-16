import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { CACHE_MAX_AGE_MS, queryClient, queryPersister } from "./lib/query-client";
import { supabase } from "./lib/supabase";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const router = createRouter({ routeTree, context: { queryClient } });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Al entrar o salir, las rutas vuelven a comprobar la sesión, y al salir no queda
// ningún dato de la cuenta anterior, ni en memoria ni guardado en el teléfono. Se
// aplaza con setTimeout porque Supabase bloquea su sesión mientras corre este
// callback: llamarlo desde dentro (como hace `beforeLoad` con `getSession`) puede
// quedarse esperando para siempre.
supabase.auth.onAuthStateChange((event) => {
  if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
  setTimeout(() => {
    if (event === "SIGNED_OUT") {
      queryClient.clear();
      void queryPersister.removeClient();
    }
    void router.invalidate();
  }, 0);
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Falta el elemento #root en index.html");

// Cada versión de la app descarta lo guardado por la anterior (`buster`): la forma de
// los datos puede haber cambiado, y para actualizar ya hizo falta red.
createRoot(rootElement).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: CACHE_MAX_AGE_MS,
        buster: __APP_VERSION__,
      }}
    >
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  </StrictMode>,
);
