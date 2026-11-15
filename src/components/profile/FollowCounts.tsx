import { RotateCw } from "lucide-react";
import { useFollowCounts } from "@/lib/use-follow";
import { cn } from "@/lib/utils";

interface FollowCountsProps {
  /** Profile whose approved follow totals to display. */
  userId: string;
  /** Spacing for placement inside the profile header (e.g. "mt-3"). */
  className?: string;
}

/**
 * One statistic slot, in exactly one of three states so they can never be
 * confused with one another:
 *   value    -> a real number, including a genuine 0
 *   loading  -> a pulsing skeleton bar, only while nothing has loaded yet
 *   error    -> a tinted dash carrying the actual RPC error message as its
 *               tooltip, paired with the pill-level retry control
 */
type SlotState =
  | { kind: "value"; n: number }
  | { kind: "loading" }
  | { kind: "error"; message: string };

/**
 * "128 Followers | 56 Following" — a compact, non-interactive statistic in
 * the profile identity area. Counts are aggregates from the get_follow_counts
 * RPC (approved relationships only) and deliberately render as plain text:
 * there is no follower list view, so nothing here is a link. A failed fetch
 * renders a visible, retryable error state — never an unexplained dash —
 * and the underlying error is logged by useFollowCounts.
 */
export function FollowCounts({ userId, className }: FollowCountsProps) {
  const q = useFollowCounts(userId);

  // No id yet (e.g. profile row still loading) — the page shows its own
  // loading state, so render nothing rather than a disabled skeleton.
  if (!userId) return null;

  const failed = q.isError && !q.data && !q.isFetching;
  const message = q.error?.message || "Follow counts unavailable";
  const states: [SlotState, SlotState] = q.data
    ? [
        { kind: "value", n: q.data.followers },
        { kind: "value", n: q.data.following },
      ]
    : failed
      ? [
          { kind: "error", message },
          { kind: "error", message },
        ]
      : [{ kind: "loading" }, { kind: "loading" }];

  return (
    <div
      className={cn(
        "inline-flex items-stretch divide-x divide-border/60 rounded-full border border-[var(--gold)]/25 bg-secondary/40 py-1.5 transition-colors hover:border-[var(--gold)]/45",
        className,
      )}
      aria-busy={q.isFetching || undefined}
      aria-label="Followers and following"
    >
      <CountSlot state={states[0]} label="Followers" />
      <CountSlot state={states[1]} label="Following" />
      {failed && (
        <button
          type="button"
          onClick={() => void q.refetch()}
          disabled={q.isFetching}
          title={`Retry — ${message}`}
          aria-label="Retry loading follow counts"
          className="flex items-center px-2.5 text-muted-foreground transition-colors hover:text-gold disabled:opacity-50 sm:px-3"
        >
          <RotateCw
            className={cn("h-3.5 w-3.5", q.isFetching && "animate-spin")}
          />
        </button>
      )}
    </div>
  );
}

function CountSlot({ state, label }: { state: SlotState; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5 px-3 sm:px-4">
      {state.kind === "loading" ? (
        <span
          aria-hidden
          className="h-4 w-8 animate-pulse rounded bg-muted-foreground/30"
        />
      ) : state.kind === "error" ? (
        <span
          title={state.message}
          className="font-display text-lg leading-none text-destructive/80"
        >
          —
        </span>
      ) : (
        <span className="font-display text-lg leading-none tabular-nums text-gold">
          {state.n}
        </span>
      )}
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
