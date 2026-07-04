import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — PRC D'or" }] }),
  component: AnalyticsPage,
});

const POSITION_COLORS: Record<string, string> = {
  Goalkeeper: "#D4AF37",
  Defender: "#B08F2A",
  Midfielder: "#E8C766",
  Winger: "#9c7a23",
  Striker: "#FFE08A",
};

function AnalyticsPage() {
  const resultsQ = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("player_results")
        .select("*")
        .order("total_points", { ascending: false });
      return data ?? [];
    },
  });

  const playersQ = useQuery({
    queryKey: ["all-players"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, position");
      return data ?? [];
    },
  });

  const votersQ = useQuery({
    queryKey: ["voters"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_period_vote_stats");
      const row = (data ?? [])[0] as { vote_count: number; voter_count: number } | undefined;
      return row?.voter_count ?? 0;
    },
  });


  const results = (resultsQ.data ?? []).map((r) => ({
    ...r,
    total_points: r.total_points ?? 0,
    first_place_votes: r.first_place_votes ?? 0,
  }));
  const players = playersQ.data ?? [];
  const ranked = results.filter((r) => r.total_points > 0);

  // Votes by position (rank by total points per position)
  const positionTotals = ranked.reduce<Record<string, number>>((acc, r) => {
    const p = r.position ?? "Unknown";
    acc[p] = (acc[p] ?? 0) + r.total_points;
    return acc;
  }, {});
  const pieData = Object.entries(positionTotals).map(([name, value]) => ({ name, value }));

  // Top 10 by points
  const topBar = ranked.slice(0, 10).map((r) => ({
    name: r.full_name?.split(" ")[0] ?? "",
    points: r.total_points,
  }));

  // First place votes
  const firstPlace = ranked
    .filter((r) => r.first_place_votes > 0)
    .slice(0, 10)
    .map((r) => ({ name: r.full_name?.split(" ")[0] ?? "", value: r.first_place_votes }));

  // Position analysis: count players per position
  const playersByPos = players.reduce<Record<string, number>>((acc, p) => {
    const k = p.position ?? "Unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  const distinctVoters = votersQ.data ?? 0;
  const participation = players.length > 0 ? Math.round((distinctVoters / players.length) * 100) : 0;


  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Analytics</div>
        <h1 className="font-display text-4xl">Voting insights</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Mini label="Registered players" value={players.length} />
        <Mini label="Voters" value={distinctVoters} />
        <Mini label="Participation" value={`${participation}%`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Top 10 by points">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="points" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Points by position">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
              >
                {pieData.map((d) => (
                  <Cell key={d.name} fill={POSITION_COLORS[d.name] ?? "#888"} />
                ))}
              </Pie>
              <Legend />
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="First-place votes">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={firstPlace} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#888" />
              <YAxis dataKey="name" type="category" stroke="#888" width={80} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="var(--color-chart-2)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Players by position">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={Object.entries(playersByPos).map(([name, value]) => ({ name, value }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="var(--color-chart-3)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "oklch(0.17 0.008 80)",
  border: "1px solid oklch(0.82 0.14 85 / 0.3)",
  borderRadius: "8px",
  color: "white",
};

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl text-gold-gradient">{value}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-strong rounded-2xl p-5">
      <h2 className="mb-4 font-display text-lg">{title}</h2>
      {children}
    </div>
  );
}
