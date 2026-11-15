import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

import type { CaptureAccount } from "./parse-capture";

// Lo que delata a cada cuenta en la captura de un pago (M15). Se escribe en Ajustes, en la
// ficha de cada cuenta, y se ajusta cuando una captura elige mal.
export const captureHintsQuery = queryOptions({
  queryKey: ["capture-hints"],
  queryFn: async (): Promise<CaptureAccount[]> => {
    const { data, error } = await supabase.from("accounts").select("id, capture_hints");
    if (error) throw error;
    return data.map((row) => ({ accountId: row.id, hints: row.capture_hints }));
  },
});
