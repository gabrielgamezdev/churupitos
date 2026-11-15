import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DayField } from "./day-field";

const TODAY = "2026-11-15";
const dateInput = { name: "day", onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() };
const field = (value: string, onChange = vi.fn()) => (
  <DayField value={value} today={TODAY} onChange={onChange} dateInput={dateInput} />
);
const checked = () => screen.getByRole("radio", { checked: true }).textContent;

describe("DayField", () => {
  it("marca el botón del día que hay", () => {
    render(field("2026-11-14"));
    expect(checked()).toBe("Ayer");
  });

  it("si el día cambia desde fuera, como al leer una captura, lo sigue", () => {
    const { rerender } = render(field(TODAY));
    expect(checked()).toBe("Hoy");
    rerender(field("2026-11-06"));
    expect(checked()).toBe("Otro día");
    expect(screen.getByLabelText("Fecha", { selector: "input" })).toBeTruthy();
    rerender(field("2026-11-14"));
    expect(checked()).toBe("Ayer");
  });

  it("«Otro día» sigue abierto aunque en el calendario quede hoy", () => {
    const onChange = vi.fn();
    const { rerender } = render(field(TODAY, onChange));
    fireEvent.click(screen.getByRole("radio", { name: "Otro día" }));
    rerender(field(TODAY, onChange));
    expect(checked()).toBe("Otro día");
    fireEvent.click(screen.getByRole("radio", { name: "Hoy" }));
    expect(onChange).toHaveBeenCalledWith(TODAY);
    expect(checked()).toBe("Hoy");
  });
});
