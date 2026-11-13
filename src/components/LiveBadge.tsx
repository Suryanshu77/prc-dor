import { cn } from "@/lib/utils";

/** Compact pulsing red pill shown beside a nav label while voting is open. */
export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "live-badge inline-flex shrink-0 items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] leading-none font-semibold uppercase tracking-wider text-red-500 ring-1 ring-red-500/25 dark:bg-red-500/20 dark:text-red-400 dark:ring-red-500/40",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_6px_0_rgba(239,68,68,0.75)] animate-live-dot dark:bg-red-400"
      />
      Live
    </span>
  );
}
