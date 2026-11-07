import { queryOptions } from "@tanstack/react-query";

import type { Currency } from "@/lib/money";
import { required } from "@/lib/required";
import { supabase } from "@/lib/supabase";

// Las deudas y los deudores: una lista aparte del libro (R17). Lo pendiente lo suma la
// base; aquí solo se lee y se le da forma.

export type DebtDirection = "payable" | "receivable";

// Lo que se pagó con un gasto (M13): sale de él, en la moneda de su cuenta.
export type DebtPayment = { operationId: string; currency: Currency; cents: number };

export type Debt = {
  id: string;
  // `payable`: lo que deben. `receivable`: lo que les deben.
  direction: DebtDirection;
  description: string;
  amountCents: number;
  currency: Currency;
  dueOn: string | null;
  // El día en que se pagó (✅): se ve ese mes, pero ya no se debe (D9). `null`, pendiente.
  paidOn: string | null;
  // Pagada sin gasto, o pendiente, `null`.
  payment: DebtPayment | null;
  position: number;
};

// Todas, por fecha límite y las que no tienen al final, como se miran.
export const debtsQuery = queryOptions({
  queryKey: ["debts"],
  queryFn: async (): Promise<Debt[]> => {
    const [debts, payments] = await Promise.all([
      supabase
        .from("debts")
        .select(
          "id, direction, description, amount_cents, currency, due_on, paid_on, paid_operation_id, position",
        )
        .order("due_on", { nullsFirst: false })
        .order("position"),
      supabase.from("debt_payments").select("debt_id, currency, paid_cents"),
    ]);
    if (debts.error) throw debts.error;
    if (payments.error) throw payments.error;
    const paymentOf = new Map(payments.data.map((row) => [row.debt_id, row]));
    return debts.data.map((row) => {
      const payment = paymentOf.get(row.id);
      return {
        id: row.id,
        direction: row.direction as DebtDirection,
        description: row.description,
        amountCents: row.amount_cents,
        currency: row.currency as Currency,
        dueOn: row.due_on,
        paidOn: row.paid_on,
        payment:
          payment && row.paid_operation_id
            ? {
                operationId: row.paid_operation_id,
                currency: required(payment.currency, "currency") as Currency,
                cents: required(payment.paid_cents, "paid_cents"),
              }
            : null,
        position: row.position,
      };
    });
  },
});

export type DebtTotal = { direction: DebtDirection; currency: Currency; totalCents: number };

// Lo pendiente por dirección y moneda, sin las pagadas: nunca se suman dos monedas (R1).
export const debtTotalsQuery = queryOptions({
  queryKey: ["debt-totals"],
  queryFn: async (): Promise<DebtTotal[]> => {
    const { data, error } = await supabase
      .from("debt_totals")
      .select("direction, currency, total_cents");
    if (error) throw error;
    return data.map((row) => ({
      direction: required(row.direction, "direction") as DebtDirection,
      currency: required(row.currency, "currency") as Currency,
      totalCents: required(row.total_cents, "total_cents"),
    }));
  },
});
