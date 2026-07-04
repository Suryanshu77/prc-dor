import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { ArrowLeft, Trophy, Award, Hash, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/players/$id")({
  head: () => ({ meta: [{ title: "Player — PRC D'or" }] }),
  component: PlayerPage,
});

function PlayerPage() {
  const { id } = Route.useParams();

  const profileQ = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const resultsQ = useQuery({
    queryKey: ["player-results", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_results")
        .select("*")
        .order("total_points", { ascending: false });
      return data ?? [];
    },
  });

  const p = profileQ.data;
  const all = resultsQ.data ?? [];
  const me = all.find((r) => r.id === id);
  const rank = me ? all.findIndex((r) => r.id === id) + 1 : null;

  if (profileQ.isLoading) return <div className="text-center py-20 text-muted-foreground">Loading…</div>;
  if (!p) return <div className="text-center py-20">Player not found.</div>;

  return (
    <div className="space-y-6">
      <Link to="/players" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All players
      </Link>

      <div className="relative overflow-hidden rounded-3xl glass-strong p-8 md:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--gold)] opacity-15 blur-3xl" />
        <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
          <PlayerAvatar path={p.profile_image} name={p.full_name} className="h-40 w-40" ring />
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-gold">PRC D'or Player</div>
            <h1 className="font-display text-4xl md:text-5xl">{p.full_name}</h1>
            {p.nickname && <div className="mt-1 text-lg text-muted-foreground">"{p.nickname}"</div>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Pill icon={MapPin}>{p.position ?? "—"}</Pill>
              {p.jersey_number && <Pill icon={Hash}>#{p.jersey_number}</Pill>}
              {p.age && <Pill>{p.age} yrs</Pill>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Trophy} label="Current rank" value={rank ? `#${rank}` : "—"} />
        <Stat icon={Award} label="Total points" value={me?.total_points ?? 0} />
        <Stat icon={Trophy} label="#1 votes" value={me?.first_place_votes ?? 0} />
      </div>
    </div>
  );
}

function Pill({ icon: Icon, children }: { icon?: typeof Trophy; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-muted-foreground">
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </span>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Trophy; label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-gold" />
      </div>
      <div className="font-display text-3xl text-gold-gradient">{value}</div>
    </div>
  );
}
