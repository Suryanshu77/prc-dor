import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Trophy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/results")({
  head: () => ({ meta: [{ title: "Results — PRC D'or" }] }),
  component: ResultsPage,
});

function ResultsPage() {
  const periodQ = useQuery({
  queryKey: ["active-period"],
  queryFn: async () => {
    const { data } = await supabase
      .from("voting_periods")
      .select("results_published,title")
      .order("year", { ascending: false })
      .limit(1)
      .single();

    return data;
  },
});
  const resultsQ = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_results")
        .select("*")
        .order("total_points", { ascending: false })
        .order("first_place_votes", { ascending: false });
      return data ?? [];
    },
    refetchInterval: 30_000,
  });

  const results = (resultsQ.data ?? []).map((r) => ({
    ...r,
    total_points: r.total_points ?? 0,
    first_place_votes: r.first_place_votes ?? 0,
  }));
  const ranked = results.filter((r) => r.total_points > 0);
  const top3 = ranked.slice(0, 3);
  const published = periodQ.data?.results_published ?? false;

  useEffect(() => {
    if (top3.length > 0 && top3[0].total_points > 0) {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.3 }, colors: ["#D4AF37", "#FFD700", "#fff"] });
    }
  }, [top3.length]);

  async function share() {
    const text = top3.length
      ? `PRC D'or leader: ${top3[0].full_name} with ${top3[0].total_points} points 🏆`
      : "PRC D'or — vote now";
    if (navigator.share) {
      try {
        await navigator.share({ title: "PRC D'or", text, url: window.location.href });
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${text} — ${window.location.href}`);
      toast.success("Copied to clipboard");
    }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">Live leaderboard</div>
          <h1 className="font-display text-4xl">PRC D'or Standings</h1>
        </div>
        <Button variant="outline" onClick={share}>
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </header>

      {!published ? (
        <div className="glass-strong rounded-2xl p-14 text-center">

  <div className="mb-6 text-6xl">
    🏆
  </div>

  <h2 className="font-display text-3xl">
    Results have not been announced yet
  </h2>

  <p className="mt-4 text-muted-foreground">
    Voting has ended.
  </p>

  <p className="text-muted-foreground">
    Please wait for the official PRC D'OR announcement.
  </p>

</div>
      ) : (
        <>
          {/* Podium */}
          <div className="grid items-end gap-4 md:grid-cols-3">
            <Podium player={top3[1]} place={2} height="h-44" />
            <Podium player={top3[0]} place={1} height="h-56" winner />
            <Podium player={top3[2]} place={3} height="h-36" />
          </div>

          {/* Leaderboard */}
          <div className="glass-strong overflow-hidden rounded-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Player</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3 text-right">#1 votes</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/30 transition hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3 font-display text-gold">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar path={r.profile_image} name={r.full_name ?? ""} className="h-9 w-9" />
                        <div>
                          <div className="font-medium">{r.full_name}</div>
                          {r.nickname && (
                            <div className="text-xs text-muted-foreground">"{r.nickname}"</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.position}</td>
                    <td className="px-4 py-3 text-right">{r.first_place_votes}</td>
                    <td className="px-4 py-3 text-right font-display text-base text-gold-gradient">
                      {r.total_points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Podium({
  player,
  place,
  height,
  winner,
}: {
  player: any;
  place: number;
  height: string;
  winner?: boolean;
}) {
  if (!player) return <div />;
  const medal = place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉";
  return (
    <div className="flex flex-col items-center">
      <div className="mb-3 text-3xl">{medal}</div>
      <PlayerAvatar
        path={player.profile_image}
        name={player.full_name}
        className={winner ? "h-28 w-28" : "h-20 w-20"}
        ring={winner}
      />
      <div className="mt-3 text-center">
        <div className="font-display text-lg">{player.full_name}</div>
        <div className="text-xs text-muted-foreground">{player.position}</div>
      </div>
      <div
        className={`mt-4 w-full ${height} rounded-t-2xl ${winner ? "bg-gold-gradient" : "bg-secondary"} flex items-center justify-center shadow-gold`}
      >
        <div className={`text-center ${winner ? "text-background" : "text-foreground"}`}>
          {winner && <Trophy className="mx-auto mb-1 h-6 w-6" />}
          <div className="font-display text-3xl">{player.total_points}</div>
          <div className="text-[10px] uppercase tracking-widest opacity-80">points</div>
        </div>
      </div>
    </div>
  );
}
