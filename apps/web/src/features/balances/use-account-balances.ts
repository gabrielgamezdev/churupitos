import { queryOptions, useQuery } from "@tanstack/react-query";

import type { Currency } from "@/lib/money";
import { supabase } from "@/lib/supabase";

export type AccountBalance = {
  accountId: string;
  name: string;
  currency: Currency;
  balanceCents: number;
  // Cuánto de ese saldo es de «Otro» (R11).
  thirdPartyCents: number;
  // Ya no se usa (M11, R20): está en cero y sale de las listas.
  archived: boolean;
};

// El saldo de hoy de cada cuenta, en el orden de las hojas del Excel. La suma la hace
// la base (R2): aquí solo se lee.
export const accountBalancesQuery = queryOptions({
  queryKey: ["account-balances"],
  queryFn: async (): Promise<AccountBalance[]> => {
    const { data, error } = await supabase.rpc("account_balances");
    if (error) throw error;
    return [...data]
      .sort((a, b) => a.position - b.position)
      .map((row) => ({
        accountId: row.account_id,
        name: row.name,
        currency: row.currency as Currency,
        balanceCents: row.balance_cents,
        thirdPartyCents: row.third_party_cents,
        archived: row.archived,
      }));
  },
});

export function useAccountBalances() {
  return useQuery(accountBalancesQuery);
}
