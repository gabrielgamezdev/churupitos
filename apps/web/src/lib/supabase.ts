import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error(
    "Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY: copia apps/web/.env.example como .env.local.",
  );
}

// La clave publicable está hecha para ir dentro de la app: quien protege los datos
// es RLS, no ella (ADR 0004). La sesión se guarda en el teléfono y se renueva
// sola, así que sobrevive a cerrar la app.
export const supabase = createClient<Database>(url, publishableKey);
