import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/toty")({
  head: () => ({ meta: [{ title: "Team of the Year — PRC D'or" }] }),
  component: TOTYPage,
});

type TOTYYear = "2026" | "2027";

interface TOTYEdition {
  value: TOTYYear;
  label: string;
  image: string | null;
  published: boolean;
}

const EDITIONS: readonly TOTYEdition[] = [
  {
    value: "2026",
    label: "2026",
    image: "/images/toty/toty-2026.png",
    published: true,
  },
  { value: "2027", label: "2027", image: null, published: false },
];

function TOTYPage() {
  const [year, setYear] = useState<TOTYYear>("2026");
  const edition = EDITIONS.find((e) => e.value === year)!;
  const [imageMissing, setImageMissing] = useState(false);

  const is2026 = edition.value === "2026";

  return (
    <div className="space-y-8">
      <header className="text-center">
        <div className="flex items-center justify-center gap-2">
          <Trophy className="h-5 w-5 text-gold" aria-hidden="true" />
          <div className="text-xs uppercase tracking-[0.2em] text-gold">
            Team of the Year
          </div>
        </div>
        <h1 className="mt-2 font-display text-5xl leading-tight text-gold-gradient">
          TEAM OF THE YEAR
        </h1>
        <p className="mt-2 text-muted-foreground">
          Celebrating the eleven finest footballers of the year.
        </p>
      </header>

      <section className="rounded-2xl glass-strong p-6 md:p-8 shadow-gold">
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Edition
          </span>
          <ToggleGroup
            type="single"
            value={year}
            onValueChange={(v) => setYear(v as TOTYYear)}
            className="w-full max-w-xs"
          >
            {EDITIONS.map((e) => (
              <ToggleGroupItem
                key={e.value}
                value={e.value}
                className={cn(
                  !e.published && year !== e.value ? "opacity-60" : "",
                )}
              >
                {e.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {is2026 ? (
          <div className="relative flex flex-col items-center justify-center min-h-[70vh] rounded-2xl overflow-hidden">
            <img
              src={edition.image!}
              alt={`PRC D'OR Team of the Year ${year}`}
              onError={() => setImageMissing(true)}
              className="max-w-full max-h-[80vh] w-auto h-auto object-contain relative z-20"
              loading="lazy"
            />
            {imageMissing && (
              <div className="mt-6 rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground bg-secondary/50 relative z-20">
                <p className="font-medium">Image not found.</p>
                <p className="mt-1 text-sm">
                  Place your 2026 TOTY artwork at:{" "}
                </p>
                <p className="mt-1 font-mono text-xs text-foreground/70 break-all">
                  public/images/toty/toty-2026.png
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-4 py-1.5 text-[10px] font-semibold text-background uppercase tracking-wider">
              COMING SOON
            </div>
            <h2 className="mt-6 font-display text-4xl leading-tight text-gold-gradient">
              2027 TEAM OF THE YEAR
            </h2>
            <p className="mt-3 font-display text-2xl text-foreground">
              The next chapter awaits.
            </p>
            <p className="mt-4 max-w-xs text-center text-muted-foreground sm:text-[0.95rem]">
              The 2027 Team of the Year has not been announced yet. Stay tuned
              as we prepare to celebrate another year of football excellence.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
