import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { authErrorMessage } from "./auth-error-message";

describe("authErrorMessage", () => {
  it("traduce las credenciales incorrectas", () => {
    const error = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
    expect(authErrorMessage(error)).toBe("Correo o contraseña incorrectos.");
  });

  it("pide esperar cuando hay demasiados intentos", () => {
    const error = new AuthApiError("Too many requests", 429, "over_request_rate_limit");
    expect(authErrorMessage(error)).toMatch(/Demasiados intentos/);
  });

  it("habla de la conexión cuando no se llega al servidor", () => {
    const error = new AuthRetryableFetchError("Failed to fetch", 0);
    expect(authErrorMessage(error)).toMatch(/No se pudo conectar/);
  });

  it("no enseña el mensaje en inglés de un error desconocido", () => {
    expect(authErrorMessage(new Error("database exploded"))).toBe(
      "No se pudo iniciar sesión. Inténtalo de nuevo.",
    );
  });
});
