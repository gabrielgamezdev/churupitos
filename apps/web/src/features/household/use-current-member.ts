import { queryOptions, useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export function currentMemberQuery(userId: string) {
  return queryOptions({
    queryKey: ["household-member", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("household_members")
        .select("display_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      // `null`: la cuenta existe pero no es del hogar, y RLS no le deja ver nada.
      return data;
    },
  });
}

export function useCurrentMember(userId: string) {
  return useQuery(currentMemberQuery(userId));
}
