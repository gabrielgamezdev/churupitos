import type { AccountBalance } from "@/features/balances/use-account-balances";
import type { Envelope } from "@/features/envelopes/queries";

// Lo que se puede elegir al registrar, mover, cobrar o planear: sin lo archivado (M11,
// R20), salvo lo que ya estaba elegido, al corregir algo de antes de archivarlo, para que
// el formulario no lo pierda de vista. La base no deja guardarlo hasta reactivarlo.

export function usableEnvelopes(envelopes: Envelope[], chosen: readonly string[] = []) {
  return envelopes.filter((envelope) => !envelope.archived || chosen.includes(envelope.id));
}

export function usableAccounts(accounts: AccountBalance[], chosen: readonly string[] = []) {
  return accounts.filter((account) => !account.archived || chosen.includes(account.accountId));
}
