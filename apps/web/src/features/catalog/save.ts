import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Currency } from "@/lib/money";
import { queryClient as appQueryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

// Crear, cambiar, archivar y borrar sobres y cuentas con las funciones de la base (ADR
// 0008), que comprueban que lo archivado esté en cero y lo borrado no tenga nada (R20).

export type EnvelopeArgs = { id: string; name: string; emoji: string | null; archived: boolean };
export type AccountArgs = { id: string; name: string; currency: Currency; archived: boolean };

async function saveEnvelope({ id, name, emoji, archived }: EnvelopeArgs) {
  const { error } = await supabase.rpc("save_envelope", {
    target_id: id,
    new_name: name,
    // Vacío es sin emoji: la base lo guarda así.
    new_emoji: emoji ?? "",
    is_archived: archived,
  });
  if (error) throw error;
}

async function deleteEnvelope(id: string) {
  const { error } = await supabase.rpc("delete_envelope", { target_id: id });
  if (error) throw error;
}

async function saveAccount({ id, name, currency, archived }: AccountArgs) {
  const { error } = await supabase.rpc("save_account", {
    target_id: id,
    new_name: name,
    new_currency: currency,
    is_archived: archived,
  });
  if (error) throw error;
}

async function deleteAccount(id: string) {
  const { error } = await supabase.rpc("delete_account", { target_id: id });
  if (error) throw error;
}

// Al terminar, cambian las listas, los nombres en los libros y lo que se puede elegir.
function useWrite<T>(write: (args: T) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: write, onSuccess: () => queryClient.invalidateQueries() });
}

export const useSaveEnvelope = () => useWrite(saveEnvelope);
export const useDeleteEnvelope = () => useWrite(deleteEnvelope);
export const useSaveAccount = () => useWrite(saveAccount);
export const useDeleteAccount = () => useWrite(deleteAccount);

// Los «Deshacer» de los avisos. Corren cuando la pantalla ya se cerró: no son hooks.
// Uno nuevo se borra; uno cambiado o archivado vuelve a como estaba; uno borrado vuelve
// con su mismo identificador.
function undo(write: () => Promise<void>) {
  return async () => {
    await write();
    await appQueryClient.invalidateQueries();
  };
}

export function undoSavedEnvelope(id: string, previous: EnvelopeArgs | undefined) {
  return undo(() => (previous ? saveEnvelope(previous) : deleteEnvelope(id)));
}

export function undoDeletedEnvelope(previous: EnvelopeArgs) {
  return undo(() => saveEnvelope(previous));
}

export function undoSavedAccount(id: string, previous: AccountArgs | undefined) {
  return undo(() => (previous ? saveAccount(previous) : deleteAccount(id)));
}

export function undoDeletedAccount(previous: AccountArgs) {
  return undo(() => saveAccount(previous));
}
