import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FootballImageKind } from "@/lib/football-images";

interface FootballImageProps {
  /** Image URL from football-images.ts; missing/failed values fall back. */
  src?: string | null;
  kind: FootballImageKind;
  alt: string;
  /** Outer tile classes: size + rounding (e.g. "h-10 w-10 rounded-lg"). */
  className?: string;
  /** Icon for values with no image (custom entries) or a failed load. */
  fallbackIcon?: LucideIcon;
  /** Size classes for the fallback icon (default h-4 w-4). */
  fallbackClassName?: string;
}

// Crests and league logos are transparent PNGs (fit inside the tile),
// flags and player portraits are photos (fill the tile).
const FIT: Record<FootballImageKind, string> = {
  club: "object-contain p-0.5",
  league: "object-contain p-0.5",
  nation: "object-cover",
  player: "object-cover object-top",
};

/**
 * Fixed-size image tile for a football favourite. A failed or absent URL
 * degrades to the caller's icon instead of a broken-image glyph, so custom
 * entries typed into the combobox render cleanly too.
 */
export function FootballImage({
  src,
  kind,
  alt,
  className,
  fallbackIcon: Fallback,
  fallbackClassName = "h-4 w-4",
}: FootballImageProps) {
  // Track the failed URL (not a boolean) so a row that starts showing the
  // fallback recovers when its src changes.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const show = !!src && failedSrc !== src;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden bg-secondary/60 text-muted-foreground",
        className,
      )}
    >
      {show && src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailedSrc(src ?? null)}
          className={cn("h-full w-full", FIT[kind])}
        />
      ) : Fallback ? (
        <Fallback className={fallbackClassName} aria-hidden="true" />
      ) : null}
    </span>
  );
}
