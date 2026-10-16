import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Money } from "./money";

describe("Money", () => {
  it("un movimiento que entra lleva «+» y el color de lo que entra", () => {
    render(<Money cents={40000} currency="VES" kind="movement" />);
    expect(screen.getByText("+Bs 400,00")).toHaveAttribute("data-tone", "in");
  });

  it("un movimiento que sale lleva «−» y el color de lo que sale", () => {
    render(<Money cents={-2000} currency="USD" kind="movement" />);
    expect(screen.getByText("−$ 20,00")).toHaveAttribute("data-tone", "out");
  });

  it("un saldo positivo va sin signo y sin color", () => {
    render(<Money cents={34000} currency="USD" />);
    expect(screen.getByText("$ 340,00")).toHaveAttribute("data-tone", "neutral");
  });

  it("un saldo por debajo de cero se marca como descubierto, no como lo que sale", () => {
    render(<Money cents={-5000} currency="VES" />);
    expect(screen.getByText("−Bs 50,00")).toHaveAttribute("data-tone", "overdrawn");
  });
});
