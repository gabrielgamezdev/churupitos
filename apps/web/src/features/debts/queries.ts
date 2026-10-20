import { queryOptions } from "@tanstack/react-query";

import type { Currency } from "@/lib/money";
import { required } from "@/lib/required";
import { supabase } from "@/lib/supabase";

// Las deudas y los deudores: una lista aparte del libro (R17). Lo pendiente lo suma la
// base; aquí solo se lee y se le da forma.

export type DebtDirection = "payable" | "receivable";

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
  position: number;
};

// Todas, por fecha límite y las que no tienen al final, como se miran.
export const debtsQuery = queryOptions({
  queryKey: ["debts"],
  queryFn: async (): Promise<Debt[]> => {
    const { data, error } = await supabase
      .from("debts")
      .select("id, direction, description, amount_cents, currency, due_on, paid_on, position")
      .order("due_on", { nullsFirst: false })
      .order("position");
    if (error) throw error;
    return data.map((row) => ({
      id: row.id,
      direction: row.direction as DebtDirection,
      description: row.description,
      amountCents: row.amount_cents,
      currency: row.currency as Currency,
      dueOn: row.due_on,
      paidOn: row.paid_on,
      position: row.position,
    }));
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
