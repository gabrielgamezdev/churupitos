import { queryOptions } from "@tanstack/react-query";

import { firstDay, monthOf, today } from "@/lib/months";
import { supabase } from "@/lib/supabase";

// Sobres y cuentas (M11): lo que dice si uno se puede borrar o archivar (R20). Las
// reglas las vuelve a comprobar la base; esto es para decirlo antes de tocar el botón.

export type EnvelopeUse = {
  // Tiene historia: se archiva, no se borra.
  hasEntries: boolean;
  // Sale en el plan de algún mes: tampoco se borra.
  inPlan: boolean;
  // Tiene plan con monto este mes o en uno siguiente: no se archiva hasta dejarlo en $0.
  plannedAhead: boolean;
};

export function envelopeUseQuery(envelopeId: string) {
  return queryOptions({
    queryKey: ["catalog-use", "envelope", envelopeId],
    queryFn: async (): Promise<EnvelopeUse> => {
      const [entries, plan] = await Promise.all([
        supabase.from("entries").select("id").eq("envelope_id", envelopeId).limit(1),
        supabase
          .from("budget_lines")
          .select("month_start, planned_usd_cents")
          .eq("envelope_id", envelopeId),
      ]);
      if (entries.error) throw entries.error;
      if (plan.error) throw plan.error;
      const thisMonth = firstDay(monthOf(today()));
      return {
        hasEntries: entries.data.length > 0,
        inPlan: plan.data.length > 0,
        plannedAhead: plan.data.some(
          (line) => line.month_start >= thisMonth && line.planned_usd_cents > 0,
        ),
      };
    },
  });
}

// Si una cuenta tiene historia: entonces se archiva, no se borra.
export function accountHasEntriesQuery(accountId: string) {
  return queryOptions({
    queryKey: ["catalog-use", "account", accountId],
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from("entries")
        .select("id")
        .eq("account_id", accountId)
        .limit(1);
      if (error) throw error;
      return data.length > 0;
    },
  });
}
