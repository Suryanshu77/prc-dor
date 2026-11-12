import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export type ApprovalStatus = "pending" | "approved" | "rejected";

interface ApprovalState {
  status: ApprovalStatus | null;
  rejectionReason: string | null;
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

/**
 * Server-authoritative approval status for the signed-in user.
 * Admins always resolve to approved (mirrors get_my_approval_status).
 * Fail closed: while loading or on error the gate must not render children.
 */
export function useApproval(): ApprovalState {
  const { user, isAdmin, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ["approval-status", user?.id],
    enabled: !authLoading && !!user,
    retry: false,
    queryFn: async (): Promise<{
      status: ApprovalStatus;
      rejectionReason: string | null;
    }> => {
      const { data, error } = await supabase.rpc("get_my_approval_status");
      if (error) {
        console.error("[approval] failed to load approval status", error);
        toast.error("Couldn't check your account status.", {
          id: "approval-status",
        });
        throw error;
      }
      const status = (data ?? null) as ApprovalStatus | null;
      if (status === "rejected") {
        const { data: row } = await supabase
          .from("voter_approvals")
          .select("rejection_reason")
          .eq("user_id", user!.id)
          .maybeSingle();
        return {
          status: "rejected",
          rejectionReason: row?.rejection_reason ?? null,
        };
      }
      // Missing row / pending / approved — treat null as fail-closed pending.
      return { status: status ?? "pending", rejectionReason: null };
    },
  });

  if (authLoading || !user) {
    return {
      status: null,
      rejectionReason: null,
      loading: true,
      error: false,
      refetch: () => {},
    };
  }
  if (isAdmin) {
    return {
      status: "approved",
      rejectionReason: null,
      loading: false,
      error: false,
      refetch: () => {},
    };
  }

  return {
    status: query.data?.status ?? null,
    rejectionReason: query.data?.rejectionReason ?? null,
    loading: query.isLoading || query.isPending,
    error: query.isError,
    refetch: () => void query.refetch(),
  };
}
