import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Trophy, Share2, Lock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/results")({
  head: () => ({ meta: [{ title: "Results — PRC D'or" }] }),
  component: ResultsPage,
});

function ResultsPage() {
  const { isAdmin } = useAuth();
  const yearsQ = useQuery({
    queryKey: ["years"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voting_periods")
        .select("id, year, results_published, results_visible")
        .order("year", { ascending: false });
      if (error) {
        console.error("[results] failed to load years", error);
        toast.error("Couldn't load available years.", {
          id: "results-years",
        });
      }
      return data ?? [];
    },
  });
  const years = yearsQ.data ?? [];
  const [periodId, setPeriodId] = useState<string | undefined>(years[0]?.id);

  useEffect(() => {
    if (years.length && (!periodId || !years.some((y) => y.id === periodId))) {
      setPeriodId(years[0].id);
    }
  }, [years, periodId]);

  const period = years.find((y) => y.id === periodId);
  const published = period?.results_published ?? false;

  const resultsVisibleQ = useQuery({
    queryKey: ["results-visible", periodId],
    queryFn: async () => {
      if (!periodId) return false;
      const { data, error } = await supabase.rpc("is_period_results_visible", {
        _period_id: periodId,
      });
      if (error) {
        console.error("[results] failed to check results visibility", error);
        toast.error("Couldn't check results visibility.", {
          id: "results-visibility",
        });
      }
      return data ?? false;
    },
    enabled: !!periodId,
  });

  const resultsVisible = resultsVisibleQ.data ?? false;

  const resultsQ = useQuery({
    queryKey: ["leaderboard", periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data, error } = await supabase.rpc("get_period_results", {
        _period_id: periodId,
      });
      if (error) {
        console.error("[results] failed to load results", error);
        toast.error("Couldn't load results.", { id: "results-leaderboard" });
      }
      return data ?? [];
    },
    enabled: !!periodId && (published || resultsVisible),
    refetchInterval: published || resultsVisible ? 30_000 : false,
  });

  const results = (resultsQ.data ?? []).map((r) => ({
    ...r,
    total_points: r.total_points ?? 0,
    first_place_votes: r.first_place_votes ?? 0,
  }));
  const ranked = results.filter((r) => r.total_points > 0);
  const top3 = ranked.slice(0, 3);

  useEffect(() => {
    if (top3.length > 0 && top3[0].total_points > 0) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.3 },
        colors: ["#D4AF37", "#FFD700", "#fff"],
      });
    }
  }, [top3.length]);

  async function share() {
    const text = top3.length
      ? `PRC D'or ${period?.year} leader: ${top3[0].full_name} with ${top3[0].total_points} points 🏆`
      : "PRC D'or — vote now";
    if (navigator.share) {
      try {
        await navigator.share({
          title: "PRC D'or",
          text,
          url: window.location.href,
        });
      } catch {
        // Ignore share cancellation
      }
    } else {
      await navigator.clipboard.writeText(`${text} — ${window.location.href}`);
      toast.success("Copied to clipboard");
    }
  }

  const showResults = published || resultsVisible || isAdmin;

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-gold">
            Results
          </div>
          <h1 className="font-display text-4xl">PRC D'or Results</h1>
        </div>
        <div className="flex items-center gap-3">
          {years.length > 0 && (
            <select
              value={periodId ?? ""}
              onChange={(e) => setPeriodId(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              aria-label="Select year"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.year}
                  {y.results_published ? "" : " (not announced)"}
                </option>
              ))}
            </select>
          )}
          <Button variant="outline" onClick={share}>
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
      </header>

      {!showResults ? (
        <div className="glass-strong rounded-2xl p-14 text-center">
          <div className="mb-6 text-6xl">🔒</div>
          <h2 className="font-display text-3xl">
            Live results are currently hidden
          </h2>
          <p className="mt-4 text-muted-foreground">
            {period
              ? `The ${period.year} results are hidden while voting is in progress.`
              : "Please select a year."}
          </p>
          <p className="text-muted-foreground">
            Results will be visible once the admin enables live results or
            voting concludes.
          </p>
          {isAdmin && (
            <p className="mt-4 text-sm text-gold">
              <Lock className="mr-1 h-4 w-4 inline" /> You are viewing as admin
              — results are visible to you in the admin dashboard.
            </p>
          )}
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
                    <td className="px-4 py-3 font-display text-gold">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar
                          path={r.profile_image}
                          name={r.full_name ?? ""}
                          className="h-9 w-9"
                        />
                        <div>
                          <div className="font-medium">{r.full_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.position}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.first_place_votes}
                    </td>
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

      {/* Special awards (Kopa / Yashin / Gerd Müller / Socrates) — each award
          reveals its own ranking when the admin opens it. */}
      <SpecialAwardsResults periodId={periodId} year={period?.year ?? null} />
    </div>
  );
}

function Podium({
  player,
  place,
  height,
  winner,
}: {
  player: {
    id: string;
    full_name: string | null;
    position: string | null;
    profile_image: string | null;
    total_points: number;
  } | null;
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
        name={player.full_name ?? ""}
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
        <div
          className={`text-center ${winner ? "text-background" : "text-foreground"}`}
        >
          {winner && <Trophy className="mx-auto mb-1 h-6 w-6" />}
          <div className="font-display text-3xl">{player.total_points}</div>
          <div className="text-[10px] uppercase tracking-widest opacity-80">
            points
          </div>
        </div>
      </div>
    </div>
  );
}

// Rows are typed locally: the generated Database types are regenerated by the
// Lovable/Supabase workflow after the special-awards migration is applied.
type SpecialAwardSummary = {
  id: string;
  voting_period_id: string;
  award_key: string;
  title: string;
  description: string | null;
  voting_open: boolean;
  results_visible: boolean;
};

type SpecialAwardResultRow = {
  award_id: string;
  candidate_id: string;
  id: string;
  full_name: string | null;
  nickname: string | null;
  player_position: string | null;
  jersey_number: number | null;
  profile_image: string | null;
  total_points: number;
  first_place_votes: number;
  total_rankings: number;
};

function SpecialAwardsResults({
  periodId,
  year,
}: {
  periodId?: string;
  year: number | null;
}) {
  const awardsQ = useQuery({
    queryKey: ["special-awards", periodId],
    enabled: !!periodId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_awards")
        .select("*")
        .eq("voting_period_id", periodId!)
        .order("award_key");
      if (error) {
        console.error("[results] failed to load special awards", error);
        toast.error("Couldn't load the special awards.", {
          id: "special-awards-results",
        });
      }
      return data ?? [];
    },
  });

  const awards = (awardsQ.data ?? []) as SpecialAwardSummary[];
  if (!periodId || awards.length === 0) return null;

  return (
    <section className="space-y-6 pt-4">
      <div>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">
          Special awards {year ?? ""}
        </div>
        <h2 className="flex items-center gap-2 font-display text-3xl">
          <Award className="h-6 w-6 text-gold" /> Award rankings
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {awards.map((a) => (
          <AwardResultsCard key={a.id} award={a} />
        ))}
      </div>
    </section>
  );
}

function AwardResultsCard({ award }: { award: SpecialAwardSummary }) {
  const visibleQ = useQuery({
    queryKey: ["special-results-visible", award.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "is_special_award_results_visible",
        { _award_id: award.id },
      );
      if (error) {
        console.error("[results] failed to check award visibility", error);
        toast.error(`Couldn't check visibility of ${award.title}.`, {
          id: `special-visibility-${award.id}`,
        });
      }
      return data ?? false;
    },
  });

  const visible = visibleQ.data ?? false;

  const resultsQ = useQuery({
    queryKey: ["special-results", award.id],
    enabled: visible,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_special_award_results", {
        _award_id: award.id,
      });
      if (error) {
        console.error("[results] failed to load award results", error);
        toast.error(`Couldn't load the ${award.title} results.`, {
          id: `special-results-${award.id}`,
        });
      }
      return data ?? [];
    },
    refetchInterval: visible ? 30_000 : false,
  });

  const rows = (
    (resultsQ.data ?? []) as unknown as SpecialAwardResultRow[]
  ).map((r) => ({
    ...r,
    total_points: r.total_points ?? 0,
    first_place_votes: r.first_place_votes ?? 0,
  }));

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-xl">
          <Award className="h-5 w-5 text-gold" /> {award.title}
        </h3>
        {award.voting_open && (
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
            Voting open
          </span>
        )}
      </div>

      {!visible ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          <Lock className="mr-1 inline h-4 w-4" /> Ranking hidden until the
          committee makes it visible.
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No ballots yet.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
              <th className="px-2 py-2">Rank</th>
              <th className="px-2 py-2">Player</th>
              <th className="px-2 py-2 text-right">#1</th>
              <th className="px-2 py-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.candidate_id}
                className="border-b border-border/30 transition hover:bg-secondary/30"
              >
                <td className="px-2 py-2 font-display text-gold">{i + 1}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar
                      path={r.profile_image}
                      name={r.full_name ?? ""}
                      className="h-7 w-7"
                    />
                    <span className="font-medium">{r.full_name}</span>
                    {r.nickname && (
                      <span className="text-xs text-muted-foreground">
                        "{r.nickname}"
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {r.first_place_votes}
                </td>
                <td className="px-2 py-2 text-right font-display text-gold">
                  {r.total_points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
