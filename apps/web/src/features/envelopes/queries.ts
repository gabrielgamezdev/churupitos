import { queryOptions } from "@tanstack/react-query";

import type { Currency } from "@/lib/money";
import { supabase } from "@/lib/supabase";

// Los sobres y lo que tiene cada uno. Toda suma la hace la base (R2): aquí solo se
// lee y se le da forma. Su libro está en features/ledger.

export type Envelope = {
  id: string;
  name: string;
  emoji: string | null;
  isThirdParty: boolean;
  position: number;
};

// Todos los sobres, en el orden del presupuesto del Excel.
export const envelopesQuery = queryOptions({
  queryKey: ["envelopes"],
  queryFn: async (): Promise<Envelope[]> => {
    const { data, error } = await supabase
      .from("envelopes")
      .select("id, name, emoji, is_third_party, position")
      .order("position");
    if (error) throw error;
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      emoji: row.emoji,
      isThirdParty: row.is_third_party,
      position: row.position,
    }));
  },
});

export type EnvelopeBalance = { envelopeId: string; currency: Currency; balanceCents: number };

// Lo que tiene cada sobre en cada moneda: hoy, o al cierre de un día (R7).
export function envelopeBalancesQuery(day?: string) {
  return queryOptions({
    queryKey: ["envelope-balances", day ?? "today"],
    queryFn: async (): Promise<EnvelopeBalance[]> => {
      const { data, error } = await supabase.rpc(
        "envelope_balances",
        day ? { as_of: day } : undefined,
      );
      if (error) throw error;
      return data.map((row) => ({
        envelopeId: row.envelope_id,
        currency: row.currency as Currency,
        balanceCents: row.balance_cents,
      }));
    },
  });
}

export type EnvelopeCell = { accountId: string; currency: Currency; balanceCents: number };

// En qué cuentas está hoy el dinero de un sobre: sus celdas (D2).
export function envelopeCellsQuery(envelopeId: string) {
  return queryOptions({
    queryKey: ["cell-balances", "envelope", envelopeId],
    queryFn: async (): Promise<EnvelopeCell[]> => {
      const { data, error } = await supabase.rpc("cell_balances").eq("envelope_id", envelopeId);
      if (error) throw error;
      return data.map((row) => ({
        accountId: row.account_id,
        currency: row.currency as Currency,
        balanceCents: row.balance_cents,
      }));
    },
  });
}

export type EnvelopeUsage = { accountId: string; envelopeId: string; uses: number };

// Cuántos gastos e ingresos sueltos tuvo cada celda desde un día: el orden de los sobres
// en Registrar (M7).
export function envelopeUsageQuery(since: string) {
  return queryOptions({
    queryKey: ["envelope-usage", since],
    queryFn: async (): Promise<EnvelopeUsage[]> => {
      const { data, error } = await supabase.rpc("envelope_usage", { since });
      if (error) throw error;
      return data.map((row) => ({
        accountId: row.account_id,
        envelopeId: row.envelope_id,
        uses: row.uses,
      }));
    },
  });
}

export type ConceptUsage = {
  description: string;
  kind: "expense" | "income";
  accountId: string;
  envelopeId: string;
  uses: number;
  lastOn: string;
};

// Cuántas veces se usó cada concepto en cada celda y tipo desde un día: las sugerencias
// de concepto en Registrar (M7).
export function conceptUsageQuery(since: string) {
  return queryOptions({
    queryKey: ["concept-usage", since],
    queryFn: async (): Promise<ConceptUsage[]> => {
      const { data, error } = await supabase.rpc("concept_usage", { since });
      if (error) throw error;
      return data.map((row) => ({
        description: row.description,
        kind: row.kind === "income" ? "income" : "expense",
        accountId: row.account_id,
        envelopeId: row.envelope_id,
        uses: row.uses,
        lastOn: row.last_on,
      }));
    },
  });
}
