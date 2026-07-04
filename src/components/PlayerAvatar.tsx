import { useEffect, useState } from "react";
import { getAvatarUrl, avatarInitials } from "@/lib/avatars";
import { cn } from "@/lib/utils";

interface Props {
  path?: string | null;
  name: string;
  className?: string;
  ring?: boolean;
}

export function PlayerAvatar({ path, name, className, ring }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getAvatarUrl(path).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [path]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-secondary text-foreground/80 font-display font-semibold",
        ring && "ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-background",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm">{avatarInitials(name)}</span>
      )}
    </div>
  );
}
