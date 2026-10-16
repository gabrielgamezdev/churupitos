import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AccountRow } from "./account-row";

function renderRow(balanceCents: number, thirdPartyCents = 0) {
  return render(
    <ul>
      <AccountRow
        name="Banco A"
        currency="VES"
        balanceCents={balanceCents}
        thirdPartyCents={thirdPartyCents}
      />
    </ul>,
  );
}

describe("AccountRow", () => {
  it("dice cuánto del saldo es «Otro», solo si hay", () => {
    renderRow(90000, 27000);
    expect(screen.getByText(/son «Otro»/)).toHaveTextContent("de los cuales Bs 270,00 son «Otro»");
  });

  it("sin «Otro», no lo menciona", () => {
    renderRow(90000);
    expect(screen.queryByText(/«Otro»/)).not.toBeInTheDocument();
  });

  it("una cuenta por debajo de cero se marca como descubierta", () => {
    renderRow(-5000);
    expect(screen.getByText("Descubierto")).toBeInTheDocument();
  });
});
