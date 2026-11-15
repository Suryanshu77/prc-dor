import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type FollowStatus = "pending" | "approved" | "rejected";

export interface FollowRequestRow {
  id: string;
  status: FollowStatus;
  created_at: string;
  follower_id: string;
}

export interface FollowRequestWithFollower extends FollowRequestRow {
  follower: {
    id: string;
    full_name: string;
    nickname: string | null;
    username: string;
    profile_image: string | null;
  } | null;
}

/**
 * Turn a server RAISE into a sentence a member can act on. The RPCs use
 * stable prefixes ('follow request:', 'voter approval:') precisely so the
 * UI can surface them verbatim instead of a raw Postgrest error.
 */
export function followErrorMessage(error: unknown, fallback: string): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : "";
  if (/^follow request:/i.test(message)) return message;
  if (/^voter approval:/i.test(message)) {
    return "Your account is still awaiting admin approval.";
  }
  return message || fallback;
}

/** The signed-in viewer's relationship with another member's profile. */
export function useFollowState(targetId: string | undefined) {
  const { user } = useAuth();
  const enabled = !!user && !!targetId && targetId !== user.id;

  return useQuery({
    queryKey: ["follow-state", user?.id, targetId],
    enabled,
    queryFn: async (): Promise<{
      id: string;
      status: FollowStatus;
    } | null> => {
      const { data, error } = await supabase
        .from("follow_requests")
        .select("id, status")
        .eq("follower_id", user!.id)
        .eq("followee_id", targetId!)
        .maybeSingle();
      if (error) {
        console.error("[follow] failed to load follow state", error);
        return null;
      }
      return data;
    },
  });
}

/** Pending requests addressed to the signed-in member (own-profile panel). */
export function useIncomingFollowRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["follow-requests", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FollowRequestWithFollower[]> => {
      const { data: requests, error } = await supabase
        .from("follow_requests")
        .select("id, status, created_at, follower_id")
        .eq("followee_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[follow] failed to load follow requests", error);
        toast.error("Couldn't load follow requests.", {
          id: "follow-requests",
        });
        return [];
      }
      const rows = (requests ?? []) as FollowRequestRow[];
      const ids = [...new Set(rows.map((r) => r.follower_id))];
      if (ids.length === 0) return [];

      // follow_requests.follower_id points at auth.users, so the follower's
      // display fields need a second query (same pattern as the admin bell).
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, username, profile_image")
        .in("id", ids);
      const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

      return rows.map((r) => ({
        ...r,
        follower:
          (byId.get(r.follower_id) as FollowRequestWithFollower["follower"]) ??
          null,
      }));
    },
    // The panel is the only place a member learns they were followed, so it
    // polls lightly rather than waiting for a realtime channel.
    refetchInterval: 30_000,
  });
}

/** Approved follower/following totals shown in a profile header. */
export interface FollowCounts {
  followers: number;
  following: number;
}

/**
 * Aggregate counts via the get_follow_counts RPC (SECURITY DEFINER,
 * aggregate-only: no rows or identities leave the database).
 *   followers = approved rows where this member is the followee
 *   following = approved rows where this member is the follower
 * Pending and rejected requests never contribute. Zero counts return 0;
 * a failure (missing RPC, approval gate, network) is logged and surfaced
 * as a query error so the UI can show a labelled, retryable error state
 * instead of a silent placeholder.
 */
export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["follow-counts", userId],
    enabled: !!userId,
    queryFn: async (): Promise<FollowCounts> => {
      const { data, error } = await supabase.rpc("get_follow_counts", {
        _user_id: userId!,
      });
      if (error) {
        // Keep the PostgREST code/message (e.g. PGRST202 "Could not find
        // the function …") visible in the console so a failed deployment
        // of the follow-counts migration is diagnosable from the browser.
        console.error("[follow] failed to load follow counts", error);
        throw error;
      }
      const row = (data ?? [])[0];
      return {
        followers: Number(row?.followers ?? 0),
        following: Number(row?.following ?? 0),
      };
    },
  });
}

function invalidateFollow(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["follow-state"] });
  void qc.invalidateQueries({ queryKey: ["follow-requests"] });
}

/**
 * Counts change only when an approved relationship is created or removed:
 * accepting a request, unfollowing, or withdrawing an already-approved row.
 * Sending or declining a pending request never does, so those paths skip
 * this (no pointless refetch).
 */
function invalidateFollowCounts(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: ["follow-counts"] });
}

export function useRequestFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followeeId: string): Promise<FollowStatus> => {
      const { data, error } = await supabase.rpc("request_follow", {
        _followee: followeeId,
      });
      if (error) throw error;
      return data as FollowStatus;
    },
    onSuccess: (status) => {
      invalidateFollow(qc);
      toast.success(
        status === "approved"
          ? "You already follow this member."
          : "Follow request sent — they'll approve it from their profile.",
      );
    },
    onError: (error) => {
      toast.error(
        followErrorMessage(error, "Couldn't send the follow request."),
      );
    },
  });
}

export function useDecideFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      decision,
    }: {
      requestId: string;
      decision: "approved" | "rejected";
    }): Promise<FollowStatus> => {
      const { data, error } = await supabase.rpc("decide_follow", {
        _request_id: requestId,
        _decision: decision,
      });
      if (error) throw error;
      return data as FollowStatus;
    },
    onSuccess: (_status, { decision }) => {
      invalidateFollow(qc);
      // Only an acceptance changes the counts; declining leaves them alone.
      if (decision === "approved") invalidateFollowCounts(qc);
      toast.success(
        decision === "approved" ? "Follow approved." : "Request declined.",
      );
    },
    onError: (error) => {
      toast.error(followErrorMessage(error, "Couldn't update the request."));
    },
  });
}

export function useRemoveFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (followeeId: string): Promise<void> => {
      const { error } = await supabase.rpc("remove_follow", {
        _followee: followeeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateFollow(qc);
      // Unfollow (and withdrawing an approved row) removes a relationship.
      invalidateFollowCounts(qc);
    },
    onError: (error) => {
      toast.error(followErrorMessage(error, "Couldn't update the follow."));
    },
  });
}
