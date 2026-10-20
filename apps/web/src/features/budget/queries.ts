import { queryOptions } from "@tanstack/react-query";

import type { Currency } from "@/lib/money";
import { firstDay, monthOf } from "@/lib/months";
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

// Un ingreso esperado del mes y, si llegó, su cobro: cuándo, en qué cuenta, cuánto en
// la moneda de la cuenta y cuánto en dólares (R8: la tasa sale de esos dos).
export type ExpectedIncome = {
  id: string;
  name: string;
  emoji: string | null;
  expectedUsdCents: number;
  receipt: {
    operationId: string;
    day: string;
    accountId: string;
    currency: Currency;
    amountCents: number;
    usdCents: number;
  } | null;
};

// Los ingresos esperados de un mes, en el orden del Excel.
export function expectedIncomesQuery(month: string) {
  return queryOptions({
    queryKey: ["expected-incomes", month],
    queryFn: async (): Promise<ExpectedIncome[]> => {
      const { data, error } = await supabase
        .from("expected_income_summary")
        .select(
          "expected_income_id, name, emoji, expected_usd_cents, operation_id, received_on, account_id, currency, received_cents, received_usd_cents",
        )
        .eq("month_start", firstDay(month))
        .order("position");
      if (error) throw error;
      return data.map((row) => ({
        id: required(row.expected_income_id, "expected_income_id"),
        name: required(row.name, "name"),
        emoji: row.emoji,
        expectedUsdCents: required(row.expected_usd_cents, "expected_usd_cents"),
        receipt:
          row.operation_id === null
            ? null
            : {
                operationId: row.operation_id,
                day: required(row.received_on, "received_on"),
                accountId: required(row.account_id, "account_id"),
                currency: required(row.currency, "currency") as Currency,
                amountCents: required(row.received_cents, "received_cents"),
                usdCents: required(row.received_usd_cents, "received_usd_cents"),
              },
      }));
    },
  });
}
