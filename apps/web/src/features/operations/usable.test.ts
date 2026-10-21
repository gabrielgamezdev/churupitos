import { describe, expect, it } from "vitest";

import type { AccountBalance } from "@/features/balances/use-account-balances";
import type { Envelope } from "@/features/envelopes/queries";

import { usableAccounts, usableEnvelopes } from "./usable";

const envelope = (id: string, archived: boolean): Envelope => ({
  id,
  name: id,
  emoji: null,
  isThirdParty: false,
  position: 1,
  archived,
});

const account = (accountId: string, archived: boolean): AccountBalance => ({
  accountId,
  name: accountId,
  currency: "VES",
  balanceCents: 0,
  thirdPartyCents: 0,
  archived,
});

describe("lo que se puede elegir (R20)", () => {
  it("sin los sobres archivados", () => {
    expect(usableEnvelopes([envelope("a", false), envelope("b", true)]).map((e) => e.id)).toEqual([
      "a",
    ]);
  });

  it("salvo el que ya estaba elegido, al corregir algo de antes de archivarlo", () => {
    expect(
      usableEnvelopes([envelope("a", false), envelope("b", true)], ["b"]).map((e) => e.id),
    ).toEqual(["a", "b"]);
  });

  it("lo mismo con las cuentas", () => {
    const accounts = [account("x", true), account("y", false)];
    expect(usableAccounts(accounts).map((a) => a.accountId)).toEqual(["y"]);
    expect(usableAccounts(accounts, ["x"]).map((a) => a.accountId)).toEqual(["x", "y"]);
  });
});
