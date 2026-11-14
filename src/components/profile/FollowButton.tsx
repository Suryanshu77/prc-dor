import { useAuth } from "@/lib/auth";
import {
  useFollowState,
  useRemoveFollow,
  useRequestFollow,
} from "@/lib/use-follow";
import { Button } from "@/components/ui/button";
import { UserCheck, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";

interface FollowButtonProps {
  targetId: string;
}

/**
 * Follow / request / following control shown on another member's profile.
 * Returns nothing on your own profile — there is nothing to follow there.
 *
 * States are driven by the single row in follow_requests, read through RLS:
 *   no row      -> Follow
 *   pending     -> Request sent (click withdraws)
 *   approved    -> Following   (click unfollows)
 *   rejected    -> Follow      (the RPC re-opens the request)
 */
export function FollowButton({ targetId }: FollowButtonProps) {
  const { user } = useAuth();
  const stateQ = useFollowState(targetId);
  const request = useRequestFollow();
  const remove = useRemoveFollow();

  if (!user || user.id === targetId) return null;

  const status = stateQ.data?.status;
  const busy = request.isPending || remove.isPending;

  if (status === "pending") {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() =>
          remove.mutate(targetId, {
            onSuccess: () => toast.success("Follow request cancelled."),
          })
        }
      >
        <UserX className="mr-2 h-4 w-4" />
        {remove.isPending ? "Cancelling…" : "Request sent"}
      </Button>
    );
  }

  if (status === "approved") {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() =>
          remove.mutate(targetId, {
            onSuccess: () => toast.success("Unfollowed."),
          })
        }
      >
        <UserCheck className="mr-2 h-4 w-4" />
        {remove.isPending ? "Updating…" : "Following"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      disabled={busy || stateQ.isPending}
      className="bg-gold-gradient text-background hover:opacity-90"
      onClick={() => request.mutate(targetId)}
    >
      <UserPlus className="mr-2 h-4 w-4" />
      {request.isPending ? "Sending…" : "Follow"}
    </Button>
  );
}
