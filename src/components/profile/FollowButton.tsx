import { useAuth } from "@/lib/auth";
import {
  useFollowState,
  useRemoveFollow,
  useRequestFollow,
} from "@/lib/use-follow";
import { Button } from "@/components/ui/button";
import { Clock, UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface FollowButtonProps {
  targetId: string;
}

/**
 * Follow / request / following control shown on another member's profile.
 * Returns nothing on your own profile — there is nothing to follow there.
 *
 * States are driven by the single row in follow_requests, read through RLS:
 *   no row      -> Follow   (gold primary; sends the request)
 *   pending     -> Request pending (amber outline; click withdraws it)
 *   approved    -> Following (gold outline; click unfollows)
 *   rejected    -> Follow   (the RPC re-opens the request)
 * The state itself loads behind a neutral disabled control, so the default
 * Follow never flashes before the real status arrives.
 */
export function FollowButton({ targetId }: FollowButtonProps) {
  const { user } = useAuth();
  const stateQ = useFollowState(targetId);
  const request = useRequestFollow();
  const remove = useRemoveFollow();

  if (!user || user.id === targetId) return null;

  const status = stateQ.data?.status;
  const busy = request.isPending || remove.isPending;

  if (stateQ.isPending) {
    return (
      <Button type="button" variant="outline" disabled>
        <Clock className="mr-2 h-4 w-4 animate-pulse" />
        Loading…
      </Button>
    );
  }

  if (status === "pending") {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        title="Cancel your follow request"
        className="border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
        onClick={() =>
          remove.mutate(targetId, {
            onSuccess: () => toast.success("Follow request cancelled."),
          })
        }
      >
        <Clock className="mr-2 h-4 w-4" />
        {remove.isPending ? "Cancelling…" : "Request pending"}
      </Button>
    );
  }

  if (status === "approved") {
    return (
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        title="Unfollow"
        className="border-[var(--gold)]/40 bg-gold/10 text-gold hover:border-[var(--gold)]/70 hover:bg-gold/15 hover:text-gold-soft"
        onClick={() =>
          remove.mutate(targetId, {
            onSuccess: () => toast.success("Unfollowed."),
          })
        }
      >
        <UserCheck className="mr-2 h-4 w-4" />
        {remove.isPending ? "Unfollowing…" : "Following"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      disabled={busy}
      className="bg-gold-gradient text-background hover:opacity-90"
      onClick={() => request.mutate(targetId)}
    >
      <UserPlus className="mr-2 h-4 w-4" />
      {request.isPending ? "Sending…" : "Follow"}
    </Button>
  );
}
