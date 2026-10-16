import { createClient, type Session } from "@supabase/supabase-js";

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

// Donde se guarda la sesión. Es la misma clave que supabase-js pondría por su cuenta,
// así que nadie pierde la sesión que ya tiene; está escrita aquí para poder leerla
// sin red (`readStoredSession`).
const sessionStorageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;

// La clave publicable está hecha para ir dentro de la app: quien protege los datos
// es RLS, no ella (ADR 0004). La sesión se guarda en el teléfono y se renueva
// sola, así que sobrevive a cerrar la app.
export const supabase = createClient<Database>(url, publishableKey, {
  auth: { storageKey: sessionStorageKey },
  global: { fetch: requestBrake.wrap((input, init) => fetch(input, init)) },
});

// Sin red, una sesión caducada no se puede renovar y `getSession` responde que no
// hay sesión. Para enseñar lo guardado basta con la última: sin red no se pide nada
// a la base, y al volver la red supabase-js la renueva o la cierra.
export function readStoredSession(): Session | null {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(sessionStorageKey) ?? "null");
    const session = stored as Session | null;
    return session?.user?.id ? session : null;
  } catch {
    return null;
  }
}
