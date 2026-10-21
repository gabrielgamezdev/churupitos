import { useMutation, useQueryClient } from "@tanstack/react-query";

import { undoSavedOperation } from "@/features/operations/save";
import { queryClient as appQueryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

import type { ReceiptEntryInput } from "./receive-form-schema";

export type SaveReceiptArgs = {
  id: string;
  incomeId: string;
  day: string;
  description: string;
  entries: ReceiptEntryInput[];
};

// Guarda un cobro con la función de la base (ADR 0008), que lo enlaza a su ingreso
// esperado y comprueba su forma y que no tenga ya otro cobro.
async function saveReceipt({ id, incomeId, day, description, entries }: SaveReceiptArgs) {
  const { error } = await supabase.rpc("save_receipt", {
    op_id: id,
    op_income_id: incomeId,
    op_date: day,
    op_description: description,
    op_entries: entries,
  });
  if (error) throw error;
}

// Al terminar, el presupuesto, los saldos y los libros pueden haber cambiado.
export function useSaveReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveReceipt,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

// El «Deshacer» del aviso: un cobro nuevo se borra, y el ingreso vuelve a ⏳; uno
// corregido vuelve a como estaba. Corre cuando la pantalla ya se cerró: no es un hook.
export function undoSavedReceipt(id: string, previous: SaveReceiptArgs | undefined) {
  if (!previous) return undoSavedOperation(id, undefined);
  return async () => {
    await saveReceipt(previous);
    await appQueryClient.invalidateQueries();
  };
}
