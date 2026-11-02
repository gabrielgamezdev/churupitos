import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { firstDay, monthOf, today } from "@/lib/months";
import { supabase } from "@/lib/supabase";

import { isDayClosed, isMonthClosed, openedMonths, type MonthLocks } from "./locks";

// La marca del corte y los meses abiertos a propósito (M12): con ellos se sabe qué meses
// están cerrados (R21).
export const monthLocksQuery = queryOptions({
  queryKey: ["month-locks"],
  queryFn: async (): Promise<MonthLocks> => {
    const [cutover, openings] = await Promise.all([
      supabase.from("cutover").select("cut_on").maybeSingle(),
      supabase.from("month_openings").select("month_start, open_until"),
    ]);
    if (cutover.error) throw cutover.error;
    if (openings.error) throw openings.error;
    return {
      cutOn: cutover.data?.cut_on ?? null,
      openings: openings.data.map((row) => ({
        month: monthOf(row.month_start),
        openUntil: row.open_until,
      })),
    };
  },
});

// Lo que necesitan las pantallas: si ya pasó el corte y si un mes o un día está cerrado.
// Mientras carga, nada está cerrado: la base lo vuelve a comprobar al guardar.
export function useMonthLocks() {
  const locks = useQuery(monthLocksQuery);
  const day = today();
  const now = new Date();
  const data = locks.data ?? { cutOn: null, openings: [] };
  return {
    afterCutover: data.cutOn !== null,
    isMonthClosed: (month: string) => isMonthClosed(month, data, day, now),
    isDayClosed: (target: string) => isDayClosed(target, data, day, now),
    openedMonths: openedMonths(data, day, now),
  };
}

async function openMonth(month: string) {
  const { data, error } = await supabase.rpc("open_month", { target_month: firstDay(month) });
  if (error) throw error;
  return data;
}

export async function closeMonth(month: string) {
  const { error } = await supabase.rpc("close_month", { target_month: firstDay(month) });
  if (error) throw error;
}

// Al abrir o cerrar un mes cambia lo que se puede tocar en todas las pantallas.
export function useOpenMonth() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: openMonth, onSuccess: () => queryClient.invalidateQueries() });
}

export function useCloseMonth() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: closeMonth, onSuccess: () => queryClient.invalidateQueries() });
}

// Cuándo se copió la base por última vez (ADR 0009); null si nunca.
export const lastBackupQuery = queryOptions({
  queryKey: ["last-backup"],
  queryFn: async (): Promise<string | null> => {
    const { data, error } = await supabase
      .from("backup_log")
      .select("taken_at")
      .order("taken_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.taken_at ?? null;
  },
});
