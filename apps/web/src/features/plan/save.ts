import { useMutation, useQueryClient } from "@tanstack/react-query";

import { firstDay } from "@/lib/months";
import { queryClient as appQueryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

import type { MonthRows } from "./plan-form-schema";

export type SaveMonthArgs = { month: string } & MonthRows;

// Guarda el presupuesto del mes entero con la función de la base (ADR 0008), que no deja
// saltar meses ni quitar lo cobrado (R19).
async function saveMonth({ month, incomes, lines }: SaveMonthArgs) {
  const { error } = await supabase.rpc("save_month", {
    target_month: firstDay(month),
    income_rows: incomes,
    line_rows: lines,
  });
  if (error) throw error;
}

async function deleteMonth(month: string) {
  const { error } = await supabase.rpc("delete_month", { target_month: firstDay(month) });
  if (error) throw error;
}

// Al terminar, el presupuesto, el cuadre y los meses que se recorren pueden haber cambiado.
export function useSaveMonth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMonth,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

// El «Deshacer» del aviso: un mes recién preparado se borra; uno cambiado vuelve a como
// estaba. Corre cuando la pantalla ya se cerró: no es un hook.
export function undoSavedMonth(month: string, previous: SaveMonthArgs | undefined) {
  return async () => {
    if (previous) await saveMonth(previous);
    else await deleteMonth(month);
    await appQueryClient.invalidateQueries();
  };
}
