import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/hall-of-fame")({
  head: () => ({ meta: [{ title: "Hall of Fame — PRC D'or" }] }),
  component: HallOfFame,
});

function HallOfFame() {
  const hofQ = useQuery({
    queryKey: ["hof"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hall_of_fame")
        .select("*, winner:winner_id(profile_image, full_name, position)")
        .order("year", { ascending: false });
      return data ?? [];
    },
  });

  const entries = hofQ.data ?? [];

  return (
    <div className="space-y-8">
      <header className="text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Hall of Fame</div>
        <h1 className="font-display text-5xl text-gold-gradient">Legends of PRC</h1>
        <p className="mt-2 text-muted-foreground">Every PRC D'or winner, immortalised.</p>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-2xl glass-strong p-12 text-center text-muted-foreground">
          No winners crowned yet. The first chapter is about to be written.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((e) => {
            const w: any = e.winner;
            const img = w?.profile_image ?? e.winner_image;
            return (
              <div
                key={e.id}
                className="relative overflow-hidden rounded-2xl glass-strong p-8 text-center shadow-gold transition hover:-translate-y-1"
              >
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--gold)] opacity-20 blur-3xl" />
                <Crown className="mx-auto h-8 w-8 text-gold animate-float" />
                <div className="mt-3 font-display text-4xl text-gold-gradient">{e.year}</div>
                <div className="mt-5 flex flex-col items-center">
                  <PlayerAvatar path={img} name={e.winner_name} className="h-24 w-24" ring />
                  <div className="mt-3 font-display text-xl">{e.winner_name}</div>
                  {w?.position && <div className="text-xs text-muted-foreground">{w.position}</div>}
                  {e.total_points && (
                    <div className="mt-2 text-sm text-gold">{e.total_points} points</div>
                  )}
                  {e.notes && (
                    <p className="mt-3 max-w-xs text-xs italic text-muted-foreground">{e.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
