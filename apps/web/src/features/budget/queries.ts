import { queryOptions } from "@tanstack/react-query";

import { monthOf } from "@/lib/months";
import { required } from "@/lib/required";
import { supabase } from "@/lib/supabase";

// El presupuesto de cada mes, como la hoja PRESUPUESTO. Lo calcula todo la base
// (R10, R12, R18); aquí solo se lee y se le da forma.

// Las dos comprobaciones del mes que no se cumplen solas (R12 a y b).
export type BudgetChecks = {
  month: string;
  expectedUsdCents: number;
  plannedUsdCents: number;
  receivedVesCents: number;
  allocatedVesCents: number;
};

// Todos los meses que tienen presupuesto, con su cuadre: son pocos, y de aquí sale
// también hasta dónde se recorre.
export const budgetChecksQuery = queryOptions({
  queryKey: ["budget-checks"],
  queryFn: async (): Promise<BudgetChecks[]> => {
    const { data, error } = await supabase
      .from("budget_checks")
      .select(
        "month_start, expected_usd_cents, planned_usd_cents, received_ves_cents, allocated_ves_cents",
      )
      .order("month_start");
    if (error) throw error;
    return data.map((row) => ({
      month: monthOf(required(row.month_start, "month_start")),
      expectedUsdCents: required(row.expected_usd_cents, "expected_usd_cents"),
      plannedUsdCents: required(row.planned_usd_cents, "planned_usd_cents"),
      receivedVesCents: required(row.received_ves_cents, "received_ves_cents"),
      allocatedVesCents: required(row.allocated_ves_cents, "allocated_ves_cents"),
    }));
  },
});
