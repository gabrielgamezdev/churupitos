import { useMutation, useQueryClient } from "@tanstack/react-query";

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
// Al terminar, todo lo leído puede haber cambiado: saldos, libros, sobres.
export function useSaveOperation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kind, day, description, entries }: SaveOperationArgs) => {
      const { error } = await supabase.rpc("save_operation", {
        op_id: id,
        op_kind: kind,
        op_date: day,
        op_description: description,
        op_entries: entries,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

// Lo que se dice cuando no se guarda. Los errores de las reglas ya vienen en español
// desde la base; los de red, no.
export function saveErrorMessage(error: unknown): string {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  if (code === "23514" || code === "42501" || code === "P0001") return message ?? "";
  if (message?.includes("fetch")) return "No se pudo conectar. Inténtalo de nuevo.";
  return "No se pudo guardar. Inténtalo de nuevo.";
}
