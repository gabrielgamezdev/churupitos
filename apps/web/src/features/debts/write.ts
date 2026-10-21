import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { Json } from "@/lib/database.types";
import { queryClient as appQueryClient } from "@/lib/query-client";
import { supabase } from "@/lib/supabase";

import type { DebtInput } from "./debt-form-schema";
import type { Debt } from "./queries";

// Lo que la app escribe en las deudas, con las funciones de la base (ADR 0008). Al
// terminar, la lista y lo pendiente pueden haber cambiado.

async function saveDebts(rows: DebtInput[]) {
  const { error } = await supabase.rpc("save_debts", { debt_rows: rows });
  if (error) throw error;
}

// Pagada el día que se diga o, sin día, hoy en Caracas (lo pone la base); o desmarcada.
async function setDebtPaid({ id, paid, day }: { id: string; paid: boolean; day?: string }) {
  const { error } = await supabase.rpc("set_debt_paid", { debt_id: id, paid, paid_day: day });
  if (error) throw error;
}

// Devuelve lo que borró, para deshacerlo, o null si ya no estaba.
async function deleteDebt(id: string): Promise<Json> {
  const { data, error } = await supabase.rpc("delete_debt", { debt_id: id });
  if (error) throw error;
  return data;
}

async function restoreDebt(snapshot: Json) {
  const { error } = await supabase.rpc("restore_debt", { snapshot });
  if (error) throw error;
}

export function useSaveDebts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveDebts,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useSetDebtPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: setDebtPaid,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDebt,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

// Los «Deshacer» del aviso (M7). Corren cuando la pantalla que guardó ya se cerró: por
// eso no son hooks.

// Lo agregado se borra, cuota a cuota; lo corregido vuelve a como estaba.
export function undoSavedDebts(rows: DebtInput[], previous: DebtInput | undefined) {
  return async () => {
    if (previous) await saveDebts([previous]);
    else await Promise.all(rows.map((row) => deleteDebt(row.id)));
    await appQueryClient.invalidateQueries();
  };
}

// La deuda vuelve a como estaba antes de marcarla o desmarcarla: si estaba pagada, con
// el día en que se pagó, no con el de hoy.
export function undoDebtPaid(before: Debt) {
  return async () => {
    await setDebtPaid({
      id: before.id,
      paid: before.paidOn !== null,
      day: before.paidOn ?? undefined,
    });
    await appQueryClient.invalidateQueries();
  };
}

// Lo borrado vuelve tal cual: su sitio en la lista, si estaba pagada y quién la agregó.
export function undoDeletedDebt(snapshot: Json) {
  return async () => {
    await restoreDebt(snapshot);
    await appQueryClient.invalidateQueries();
  };
}
