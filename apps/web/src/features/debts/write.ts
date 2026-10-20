import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { DebtInput } from "./debt-form-schema";

// Lo que la app escribe en las deudas, con las funciones de la base (ADR 0008). Al
// terminar, la lista y lo pendiente pueden haber cambiado.

export function useSaveDebts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: DebtInput[]) => {
      const { error } = await supabase.rpc("save_debts", { debt_rows: rows });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

// Marcarla pagada hoy (en Caracas, lo pone la base) o desmarcarla.
export function useSetDebtPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase.rpc("set_debt_paid", { debt_id: id, paid });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_debt", { debt_id: id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
