import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { supabase } from "./lib/supabase";
import { routeTree } from "./routeTree.gen";
import "./styles.css";

const queryClient = new QueryClient();
const router = createRouter({ routeTree, context: { queryClient } });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Al entrar o salir, las rutas vuelven a comprobar la sesión, y al salir no queda
// en memoria ningún dato de la cuenta anterior. Se aplaza con setTimeout porque
// Supabase bloquea su sesión mientras corre este callback: llamarlo desde dentro
// (como hace `beforeLoad` con `getSession`) puede quedarse esperando para siempre.
supabase.auth.onAuthStateChange((event) => {
  if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
  setTimeout(() => {
    if (event === "SIGNED_OUT") queryClient.clear();
    void router.invalidate();
  }, 0);
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Falta el elemento #root en index.html");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
