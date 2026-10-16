import { queryOptions, useQuery } from "@tanstack/react-query";

import type { Currency } from "@/lib/money";
import { supabase } from "@/lib/supabase";

export type CurrencyTotal = {
  currency: Currency;
  totalCents: number;
  thirdPartyCents: number;
  ownCents: number;
};

// Lo que hay hoy en cada moneda, con y sin «Otro» (R11). La suma la hace la base
// (R2): aquí solo se lee.
export const currencyTotalsQuery = queryOptions({
  queryKey: ["currency-totals"],
  queryFn: async (): Promise<CurrencyTotal[]> => {
    const { data, error } = await supabase.rpc("currency_totals");
    if (error) throw error;
    return data
      .map((row) => ({
        currency: row.currency as Currency,
        totalCents: row.total_cents,
        thirdPartyCents: row.third_party_cents,
        ownCents: row.own_cents,
      }))
      .sort((a, b) => (a.currency === "VES" ? -1 : b.currency === "VES" ? 1 : 0));
  },
});

export function useCurrencyTotals() {
  return useQuery(currencyTotalsQuery);
}
