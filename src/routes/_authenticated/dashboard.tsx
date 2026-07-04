import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import trophyImg from "@/assets/trophy-hero.jpg";
import { Trophy, Users, Vote, CalendarClock, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — PRC D'or" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const periodQ = useQuery({
    queryKey: ["active-period"],
    queryFn: async () => {
      const { data } = await supabase
        .from("voting_periods")
        .select("*")
        .eq("is_active", true)
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const statsQ = useQuery({
    queryKey: ["dashboard-stats", periodQ.data?.id],
    enabled: !!periodQ.data,
    queryFn: async () => {
      const [players, stats, mine] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.rpc("get_period_vote_stats", { _period_id: periodQ.data!.id }),
        supabase.rpc("has_voted_in_period", { _period_id: periodQ.data!.id }),
      ]);
      const row = (stats.data ?? [])[0] as { vote_count: number; voter_count: number } | undefined;
      return {
        playersCount: players.count ?? 0,
        voteCount: row?.vote_count ?? 0,
        votersCount: row?.voter_count ?? 0,
        hasVoted: mine.data === true,
      };
    },

  });

  const profile = profileQ.data;
  const period = periodQ.data;
  const stats = statsQ.data;
  const completion =
    stats && stats.playersCount > 0 ? Math.round((stats.votersCount / stats.playersCount) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <PlayerAvatar
            path={profile?.profile_image}
            name={profile?.full_name ?? "Player"}
            className="h-16 w-16"
            ring
          />
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Welcome back
            </div>
            <h1 className="font-display text-3xl">
              {profile?.full_name?.split(" ")[0] ?? "Player"}
            </h1>
            <div className="text-sm text-muted-foreground">
              {profile?.position ?? "—"}
              {profile?.jersey_number ? ` · #${profile.jersey_number}` : ""}
            </div>
          </div>
        </div>
        <div
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${stats?.hasVoted ? "border-[var(--gold)]/40 text-gold" : "border-destructive/40 text-destructive"}`}
        >
          {stats?.hasVoted ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Vote submitted
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4" /> Vote not submitted
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl glass-strong p-8 md:p-12">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--gold)] opacity-20 blur-3xl" />
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gold">
              {period?.title ?? "PRC D'or"}
            </div>
            <h2 className="font-display text-4xl leading-tight md:text-5xl">
              Who deserves the <span className="text-gold-gradient">PRC D'or {period?.year}</span>?
            </h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Voting is {period?.is_active ? "live" : "closed"}. Rank your top 10 players — your
              voice helps crown the season's best.
            </p>
            <Countdown endsAt={period?.ends_at} />
            <div className="mt-6 flex gap-3">
              {!stats?.hasVoted ? (
                <Link
                  to="/vote"
                  className="rounded-md bg-gold-gradient px-5 py-2.5 font-medium text-background shadow-gold transition hover:opacity-90"
                >
                  Cast your vote
                </Link>
              ) : (
                <Link
                  to="/results"
                  className="rounded-md bg-gold-gradient px-5 py-2.5 font-medium text-background shadow-gold transition hover:opacity-90"
                >
                  See live results
                </Link>
              )}
              <Link
                to="/players"
                className="rounded-md border border-border px-5 py-2.5 font-medium hover:bg-secondary"
              >
                View players
              </Link>
            </div>
          </div>
          <div className="relative hidden md:block">
            <img
              src={trophyImg}
              alt="Trophy"
              width={600}
              height={400}
              loading="lazy"
              className="animate-float mx-auto max-h-[300px] w-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Registered players"
          value={stats?.playersCount ?? 0}
        />
        <StatCard icon={Vote} label="Votes submitted" value={stats?.voteCount ?? 0} />
        <StatCard
          icon={Trophy}
          label="Voting completion"
          value={`${completion}%`}
          sub={`${stats?.votersCount ?? 0} of ${stats?.playersCount ?? 0} voters`}
        />
        <StatCard
          icon={CalendarClock}
          label="Days remaining"
          value={daysRemaining(period?.ends_at)}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Trophy;
  label: string;
  value: number | string;
  sub?: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 transition hover:shadow-gold">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-gold" />
      </div>
      <div className="font-display text-3xl text-gold-gradient">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function daysRemaining(end?: string | null) {
  if (!end) return "—";
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return "Closed";
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function Countdown({ endsAt }: { endsAt?: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!endsAt) return null;
  const diff = Math.max(0, new Date(endsAt).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const Box = ({ v, l }: { v: number; l: string }) => (
    <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-center">
      <div className="font-display text-2xl text-gold-gradient">{v.toString().padStart(2, "0")}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{l}</div>
    </div>
  );

  return (
    <div className="mt-5 grid max-w-sm grid-cols-4 gap-2">
      <Box v={d} l="days" />
      <Box v={h} l="hrs" />
      <Box v={m} l="min" />
      <Box v={s} l="sec" />
    </div>
  );
}
