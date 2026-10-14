import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { createRequestBrake } from "./request-brake";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY: copia apps/web/.env.example como .env.local.",
  );
}

// Toda petición a Supabase, la de los datos y la del login, pasa por el freno.
export const requestBrake = createRequestBrake();

// La clave publicable está hecha para ir dentro de la app: quien protege los datos
// es RLS, no ella (ADR 0004). La sesión se guarda en el teléfono y se renueva
// sola, así que sobrevive a cerrar la app.
export const supabase = createClient<Database>(url, publishableKey, {
  global: { fetch: requestBrake.wrap((input, init) => fetch(input, init)) },
});
