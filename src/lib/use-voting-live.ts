import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  deriveVotingLiveStatus,
  VOTING_LIVE_REFETCH_MS,
  type VotingLiveStatus,
} from "@/lib/voting-live";

/**
 * LIVE status for the nav badges. Reuses the app-wide query keys so admin
 * toggles (["active-period"] / ["special-awards"] invalidations) refresh the
 * badges immediately; a poll covers changes made outside this tab.
 * Errors resolve to "not live" — an unknown state never shows LIVE.
 *
 * Both queryFns intentionally mirror the app's existing ones for these keys
 * byte for byte: React Query shares cached rows across observers of the same
 * key, so a narrower select here would hand vote.tsx / admin.tsx a row missing
 * the columns they read.
 */
export function useVotingLiveStatus(): VotingLiveStatus {
  const { user } = useAuth();

  const periodQ = useQuery({
    queryKey: ["active-period"],
    // RLS blocks anon reads of voting_periods; skip the pointless request on
    // public pages (the-creator) instead of polling a guaranteed error.
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voting_periods")
        .select("*")
        .eq("is_active", true)
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[voting-live] failed to load active period", error);
      }
      return data;
    },
    refetchInterval: VOTING_LIVE_REFETCH_MS,
    refetchOnWindowFocus: true,
  });

  const awardsQ = useQuery({
    queryKey: ["special-awards"],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_awards")
        .select("*")
        .order("award_key");
      if (error) {
        console.error("[voting-live] failed to load special awards", error);
      }
      return data ?? [];
    },
    refetchInterval: VOTING_LIVE_REFETCH_MS,
    refetchOnWindowFocus: true,
  });

  return deriveVotingLiveStatus({
    activePeriod: periodQ.data,
    specialAwards: awardsQ.data,
  });
}
