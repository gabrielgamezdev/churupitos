import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

// Los nombres de los del hogar, por su usuario: quién registró cada movimiento (M7).
// Un objeto y no un Map: la caché se guarda en el teléfono como JSON.
export const householdMembersQuery = queryOptions({
  queryKey: ["household-members"],
  queryFn: async (): Promise<Record<string, string>> => {
    const { data, error } = await supabase
      .from("household_members")
      .select("user_id, display_name")
      .order("display_name");
    if (error) throw error;
    return Object.fromEntries(data.map((row) => [row.user_id, row.display_name]));
  },
});
