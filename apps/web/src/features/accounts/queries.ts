import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

// Las consultas propias de la pantalla de una cuenta; su libro está en
// features/ledger. Todo saldo lo suma la base (R2): aquí solo se lee.

export type Cell = { envelopeId: string; balanceCents: number };

// Cuánto hay hoy de cada sobre en la cuenta: sus celdas.
export function accountCellsQuery(accountId: string) {
  return queryOptions({
    queryKey: ["cell-balances", "account", accountId],
    queryFn: async (): Promise<Cell[]> => {
      const { data, error } = await supabase.rpc("cell_balances").eq("account_id", accountId);
      if (error) throw error;
      return data.map((row) => ({ envelopeId: row.envelope_id, balanceCents: row.balance_cents }));
    },
  });
}

// El saldo de cada cuenta al cierre de un día, por id de cuenta: con él se abre y se
// cierra un mes (R7). Un objeto y no un Map: la caché se guarda en el teléfono como
// JSON, y un Map volvería vacío.
export function balancesAtQuery(day: string) {
  return queryOptions({
    queryKey: ["account-balances", day],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase.rpc("account_balances", { as_of: day });
      if (error) throw error;
      return Object.fromEntries(data.map((row) => [row.account_id, row.balance_cents]));
    },
  });
}
