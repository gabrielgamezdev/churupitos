import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryClient as appQueryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

import type { EntryInput, OperationKind } from "./operation-draft";

export type SaveOperationArgs = {
  id: string;
  kind: OperationKind;
  day: string;
  description: string;
  entries: EntryInput[];
};

// Guarda una operación con la función de la base (ADR 0008), que la comprueba entera.
async function saveOperation({ id, kind, day, description, entries }: SaveOperationArgs) {
  const { error } = await supabase.rpc("save_operation", {
    op_id: id,
    op_kind: kind,
    op_date: day,
    op_description: description,
    op_entries: entries,
  });
  if (error) throw error;
}

// Borra una operación registrada en la app (ADR 0008). Lo importado, la base no deja.
async function deleteOperation(id: string) {
  const { error } = await supabase.rpc("delete_operation", { op_id: id });
  if (error) throw error;
}

// Al terminar, todo lo leído puede haber cambiado: saldos, libros, sobres.
export function useSaveOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveOperation,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDeleteOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOperation,
    // Todo menos la operación borrada: su hoja se ve aún mientras baja, y volver a
    // pedirla daría error.
    onSuccess: (_data, id) =>
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) => !(queryKey[0] === "operation" && queryKey[1] === id),
      }),
  });
}

// El «Deshacer» del aviso después de guardar: lo nuevo se borra y lo corregido vuelve a
// como estaba. Corre cuando la pantalla que guardó ya se cerró: por eso no es un hook.
export function undoSavedOperation(id: string, previous: SaveOperationArgs | undefined) {
  return async () => {
    if (previous) await saveOperation(previous);
    else await deleteOperation(id);
    await appQueryClient.invalidateQueries();
  };
}
