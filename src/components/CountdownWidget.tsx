import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  cycleOf,
  formatCompact,
  formatIstDate,
  resolveMilestone,
  timeLeft,
} from "@/lib/prc-countdown";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-gold/20 bg-accent/20 px-1 py-2 text-center">
      <div className="font-display text-lg leading-none text-gold-gradient">
        {value}
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export function CountdownWidget() {
  const now = useNow();
  const milestone = resolveMilestone(now);
  const remaining = timeLeft(now, milestone.at);
  const cycle = cycleOf(milestone);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex max-w-full flex-wrap items-center justify-end gap-x-2.5 gap-y-1 rounded-lg border border-gold/30 bg-background/60 px-3 py-1.5 text-gold transition-colors hover:border-gold/60 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="text-[9px] font-semibold tracking-[0.2em] uppercase sm:text-[10px]">
              PRC D&apos;OR COUNTDOWN
            </span>
          </span>
          <span className="font-display text-[13px] font-semibold tabular-nums sm:text-sm">
            {formatCompact(remaining)}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        collisionPadding={12}
        className="prc-countdown-popover z-[60] w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border-gold/30 bg-background/95 p-0 text-foreground shadow-gold backdrop-blur-md"
      >
        <div
          className="p-3.5"
          role="timer"
          aria-label={`Countdown to ${milestone.name}`}
        >
          <div className="grid grid-cols-4 gap-1.5">
            <Unit value={remaining.days} label="Days" />
            <Unit value={remaining.hours} label="Hours" />
            <Unit value={remaining.minutes} label="Minutes" />
            <Unit value={remaining.seconds} label="Seconds" />
          </div>

          <div className="mt-3 rounded-lg border border-gold/25 bg-accent/20 px-3 py-2.5">
            <div className="font-display text-base leading-tight text-gold-gradient">
              {milestone.name}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {milestone.exact}
            </div>
          </div>

          <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
            {cycle.map((item) => {
              const isNext =
                item.key === milestone.key && item.year === milestone.year;
              return (
                <li
                  key={item.key}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <span
                    className={cn(
                      "flex items-center gap-1.5",
                      isNext ? "text-gold" : "text-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        isNext ? "bg-gold" : "bg-border",
                      )}
                    />
                    {item.name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums",
                      isNext ? "text-gold-soft" : "text-muted-foreground/80",
                    )}
                  >
                    {formatIstDate(item.at)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
