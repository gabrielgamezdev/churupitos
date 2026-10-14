import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";

// Lo que se le dice a la persona cuando no puede entrar. Los mensajes de Supabase
// vienen en inglés y a veces cuentan detalles internos: aquí se traducen a lo que
// la persona puede hacer.
export function authErrorMessage(error: unknown): string {
  if (isAuthRetryableFetchError(error)) {
    return "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.";
  }
  if (isAuthApiError(error)) {
    switch (error.code) {
      case "invalid_credentials":
        return "Correo o contraseña incorrectos.";
      case "over_request_rate_limit":
        return "Demasiados intentos. Espera un momento antes de volver a probar.";
      case "user_banned":
        return "Esta cuenta está desactivada.";
    }
  }
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}
