import { AuthApiError } from "@supabase/supabase-js";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginForm } from "./login-form";

function setup(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup();
  render(<LoginForm onSubmit={onSubmit} />);
  return { user, onSubmit };
}

describe("LoginForm", () => {
  it("pide el correo y la contraseña antes de intentar entrar", async () => {
    const { user, onSubmit } = setup();

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Escribe tu correo.")).toBeInTheDocument();
    expect(screen.getByText("Escribe tu contraseña.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("avisa de un correo mal escrito", async () => {
    const { user, onSubmit } = setup();

    await user.type(screen.getByLabelText("Correo"), "no-es-un-correo");
    await user.type(screen.getByLabelText("Contraseña"), "una-contraseña");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Ese correo no parece válido.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("entra con el correo sin espacios alrededor", async () => {
    const { user, onSubmit } = setup();

    await user.type(screen.getByLabelText("Correo"), "  ana@ejemplo.test ");
    await user.type(screen.getByLabelText("Contraseña"), "una-contraseña");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: "ana@ejemplo.test",
      password: "una-contraseña",
    });
  });

  it("muestra en español por qué no pudo entrar", async () => {
    const rejected = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
    const { user } = setup(vi.fn().mockRejectedValue(rejected));

    await user.type(screen.getByLabelText("Correo"), "ana@ejemplo.test");
    await user.type(screen.getByLabelText("Contraseña"), "equivocada");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contraseña incorrectos.");
  });
});
