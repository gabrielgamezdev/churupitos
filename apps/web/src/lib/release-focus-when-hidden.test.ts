import { afterEach, describe, expect, it } from "vitest";

import { releaseFocusWhenHidden } from "./release-focus-when-hidden";

const show = (state: DocumentVisibilityState) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("al salir de la app (M14)", () => {
  let stop = () => {};
  afterEach(() => {
    stop();
    show("visible");
    document.body.innerHTML = "";
  });

  it("suelta el campo elegido, y lo escrito se queda", () => {
    stop = releaseFocusWhenHidden();
    document.body.innerHTML = '<input id="amount" value="12,00" />';
    const input = document.getElementById("amount") as HTMLInputElement;
    input.focus();
    show("hidden");
    expect(document.activeElement).not.toBe(input);
    expect(input.value).toBe("12,00");
  });

  it("mientras se ve, no suelta nada", () => {
    stop = releaseFocusWhenHidden();
    document.body.innerHTML = '<input id="amount" />';
    const input = document.getElementById("amount") as HTMLInputElement;
    input.focus();
    show("visible");
    expect(document.activeElement).toBe(input);
  });

  it("un botón elegido no abre teclado: se deja", () => {
    stop = releaseFocusWhenHidden();
    document.body.innerHTML = "<button>Guardar</button>";
    const button = document.querySelector("button") as HTMLButtonElement;
    button.focus();
    show("hidden");
    expect(document.activeElement).toBe(button);
  });
});
