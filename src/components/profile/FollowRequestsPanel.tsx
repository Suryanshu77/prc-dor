import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useDecideFollow, useIncomingFollowRequests } from "@/lib/use-follow";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { UserCheck, UserX } from "lucide-react";

/**
 * Pending follow requests addressed to the signed-in member, rendered on
 * their own profile. Hidden entirely when there is nothing waiting, so the
 * page stays a normal profile rather than an inbox.
 */
export function FollowRequestsPanel() {
  const { user } = useAuth();
  const requestsQ = useIncomingFollowRequests();
  const decide = useDecideFollow();

  if (!user) return null;
  const requests = requestsQ.data ?? [];
  if (requestsQ.isSuccess && requests.length === 0) return null;

  return (
    <section className="glass-strong rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-2">
        <UserCheck className="h-4 w-4 text-gold" aria-hidden="true" />
        <h2 className="font-display text-xl text-foreground">
          Follow requests
        </h2>
        {!requestsQ.isLoading && requests.length > 0 && (
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">
            {requests.length}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Members asking to follow you. Approving lets them follow you; declining
        dismisses the request.
      </p>

      {requestsQ.isLoading && (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      )}

      {requests.length > 0 && (
        <ul className="mt-4 divide-y divide-border/50">
          {requests.map((request) => {
            const follower = request.follower;
            const name = follower
              ? follower.nickname || follower.full_name
              : "Someone";
            return (
              <li
                key={request.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <PlayerAvatar
                    path={follower?.profile_image ?? null}
                    name={name}
                    className="h-10 w-10 shrink-0"
                  />
                  <div className="min-w-0">
                    {follower?.username ? (
                      <Link
                        to="/players/$username"
                        params={{ username: follower.username }}
                        className="block truncate text-sm font-medium hover:text-gold"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-medium">
                        {name}
                      </span>
                    )}
                    {follower?.username && (
                      <span className="block truncate text-xs text-muted-foreground">
                        @{follower.username}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={decide.isPending}
                    className="bg-gold-gradient text-background hover:opacity-90"
                    onClick={() =>
                      decide.mutate({
                        requestId: request.id,
                        decision: "approved",
                      })
                    }
                  >
                    <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={decide.isPending}
                    onClick={() =>
                      decide.mutate({
                        requestId: request.id,
                        decision: "rejected",
                      })
                    }
                  >
                    <UserX className="mr-1.5 h-3.5 w-3.5" />
                    Decline
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
