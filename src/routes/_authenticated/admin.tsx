import AdminLayout from "@/components/admin/AdminLayout";
import VoteAuditSection from "@/components/admin/VoteAuditSection";
import FinalRankingSection from "@/components/admin/FinalRankingSection";
import { deletePlayer } from "@/lib/admin-delete-player.server";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { toast } from "sonner";
import {
  Shield,
  Crown,
  RotateCcw,
  Trash2,
  Plus,
  Trophy,
  Award,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — PRC D'or" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!isAdmin) return <Navigate to="/dashboard" />;

  return (
    <AdminLayout>
      <div className="space-y-10">
        <header>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
            <Shield className="h-3 w-3" />
            Admin
          </div>

          <h1 className="font-display text-4xl">Control room</h1>
        </header>

        <PeriodSection />

        <VoteAuditSection />

        <FinalRankingSection />

        <SpecialAwardsSection />

        <PlayersSection />

        <HallOfFameSection />
      </div>
    </AdminLayout>
  );
}

function PeriodSection() {
  const qc = useQueryClient();
  const periodsQ = useQuery({
    queryKey: ["periods"],
    queryFn: async () => {
      const { data } = await supabase
        .from("voting_periods")
        .select("*")
        .order("year", { ascending: false });
      return data ?? [];
    },
  });

  async function toggle(id: string, active: boolean) {
    if (active) {
      await supabase
        .from("voting_periods")
        .update({ is_active: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");
    }
    await supabase
      .from("voting_periods")
      .update({ is_active: active })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["periods"] });
    qc.invalidateQueries({ queryKey: ["active-period"] });
    toast.success("Updated");
  }

  async function toggleResultsVisibility(id: string, visible: boolean) {
    await supabase
      .from("voting_periods")
      .update({ results_visible: visible })
      .eq("id", id);
    qc.invalidateQueries({ queryKey: ["periods"] });
    qc.invalidateQueries({ queryKey: ["active-period"] });
    toast.success(
      visible ? "Live results now visible" : "Live results now hidden",
    );
  }

  async function resetVotes(id: string) {
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("voting_period_id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Votes reset");
      qc.invalidateQueries();
    }
  }

  async function declareWinner(periodId: string) {
    const { data, error: resultsError } = await supabase.rpc(
      "get_period_results",
      { _period_id: periodId },
    );
    if (resultsError) {
      console.error("[admin] failed to load results", resultsError);
      return toast.error("Couldn't load results for this period.");
    }
    const winner = (data ?? [])[0];
    if (!winner) return toast.error("No results yet");
    const period = periodsQ.data?.find((p) => p.id === periodId);
    if (!period) return toast.error("Voting period not found.");

    const { error: periodError } = await supabase
      .from("voting_periods")
      .update({
        winner_id: winner.id,
        is_active: false,
        results_published: true,
      })
      .eq("id", periodId);
    if (periodError) {
      console.error("[admin] failed to record the winner", periodError);
      return toast.error("Couldn't update the voting period.");
    }

    const { error: hofError } = await supabase.from("hall_of_fame").upsert(
      {
        year: period.year,
        winner_id: winner.id,
        winner_name: winner.full_name!,
        winner_image: winner.profile_image,
        total_points: winner.total_points,
      },
      { onConflict: "year" },
    );
    if (hofError) {
      console.error("[admin] failed to update hall of fame", hofError);
      return toast.error(
        "Voting period updated, but the Hall of Fame entry failed. Declare again to repair it.",
      );
    }

    toast.success(`${winner.full_name} crowned!`);
    qc.invalidateQueries();
  }

  return (
    <section className="glass-strong rounded-2xl p-6">
      <h2 className="mb-4 font-display text-2xl">Voting periods</h2>
      <div className="space-y-3">
        {(periodsQ.data ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-4 rounded-lg border border-border p-4"
          >
            <div className="flex-1">
              <div className="font-display text-lg">{p.title}</div>

              <div className="text-xs text-muted-foreground">
                Year {p.year} · ends{" "}
                {p.ends_at ? new Date(p.ends_at).toLocaleDateString() : "—"}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              Active
              <Switch
                checked={p.is_active}
                onCheckedChange={(v) => toggle(p.id, v)}
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              Live Results
              <Switch
                checked={p.results_visible ?? false}
                onCheckedChange={(v) => toggleResultsVisibility(p.id, v)}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {p.is_active ? (
                <span className="flex items-center gap-1 text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />{" "}
                  OPEN
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />{" "}
                  CLOSED
                </span>
              )}
              {" · "}
              {p.results_visible ? (
                <span className="flex items-center gap-1 text-green-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />{" "}
                  VISIBLE
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />{" "}
                  HIDDEN
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => declareWinner(p.id)}
            >
              <Crown className="mr-1 h-4 w-4" />
              Declare winner
            </Button>

            <ResetButton onConfirm={() => resetVotes(p.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ResetButton({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <RotateCcw className="mr-1 h-4 w-4" /> Reset votes
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all votes?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every vote for this period. Players can
              vote again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function PlayersSection() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const playersQ = useQuery({
    queryKey: ["admin-players"],
    queryFn: async () => {
      const [{ data: profiles }, { data: emails }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, position, jersey_number, profile_image")
          .order("full_name"),
        supabase.rpc("admin_list_player_emails"),
      ]);
      const emailMap = new Map(
        (emails ?? []).map((e: { id: string; email: string }) => [
          e.id,
          e.email,
        ]),
      );
      return (profiles ?? []).map((p) => ({
        ...p,
        email: emailMap.get(p.id) ?? "",
      }));
    },
  });

  async function confirmDelete() {
    const target = deleteTarget;
    if (!target || busyId !== null) return;
    setBusyId(target.id);
    try {
      const result = await deletePlayer({ data: { targetId: target.id } });
      if (result.ok) {
        toast.success(`${target.name} deleted`);
        setDeleteTarget(null);
        qc.invalidateQueries({ queryKey: ["admin-players"] });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete player",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="glass-strong rounded-2xl p-6">
      <h2 className="mb-4 font-display text-2xl">
        Players ({playersQ.data?.length ?? 0})
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Position</th>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(playersQ.data ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border/30">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <PlayerAvatar
                      path={p.profile_image}
                      name={p.full_name}
                      className="h-8 w-8"
                    />
                    {p.full_name}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.email}</td>
                <td className="px-3 py-2">{p.position}</td>
                <td className="px-3 py-2">{p.jersey_number ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setDeleteTarget({ id: p.id, name: p.full_name })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && busyId === null) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this player permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              The player{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              will be permanently removed from PRC D'or.
              <span className="mt-2 block">
                This will remove their PRC D'OR data and permanently delete
                their account. They will no longer be able to log in.
              </span>
            </AlertDialogDescription>
            <div className="mt-1 text-sm font-medium text-destructive">
              This action cannot be undone.
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busyId !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {busyId !== null ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function HallOfFameSection() {
  const qc = useQueryClient();
  const [year, setYear] = useState<number>(new Date().getFullYear() - 1);
  const [winner, setWinner] = useState("");
  const [points, setPoints] = useState<number | "">("");
  const [notes, setNotes] = useState("");

  async function add() {
    if (!winner || !year) return toast.error("Year and winner required");
    const { error } = await supabase.from("hall_of_fame").upsert(
      {
        year,
        winner_name: winner,
        total_points: points || null,
        notes: notes || null,
      },
      { onConflict: "year" },
    );
    if (error) toast.error(error.message);
    else {
      toast.success("Added to Hall of Fame");
      setWinner("");
      setPoints("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["hof"] });
    }
  }

  return (
    <section className="glass-strong rounded-2xl p-6">
      <h2 className="mb-4 font-display text-2xl">Hall of Fame</h2>
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label>Year</Label>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Winner name</Label>
          <Input value={winner} onChange={(e) => setWinner(e.target.value)} />
        </div>
        <div>
          <Label>Points</Label>
          <Input
            type="number"
            value={points}
            onChange={(e) =>
              setPoints(e.target.value ? Number(e.target.value) : "")
            }
          />
        </div>
        <div className="sm:col-span-4">
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>
      <Button
        className="mt-4 bg-gold-gradient text-background hover:opacity-90"
        onClick={add}
      >
        <Plus className="mr-1 h-4 w-4" /> Add entry
      </Button>
    </section>
  );
}

// Rows are typed locally: the generated Database types are regenerated by the
// Lovable/Supabase workflow after the special-awards migration is applied.
type SpecialAward = {
  id: string;
  voting_period_id: string;
  award_key: "kopa" | "yashin" | "gerd_muller" | "socrates";
  title: string;
  description: string | null;
  eligibility_type: "all" | "by_position" | "max_age";
  eligibility_position: string | null;
  eligibility_max_age: number | null;
  voting_open: boolean;
  results_visible: boolean;
};

type SpecialCandidate = {
  id: string;
  award_id: string;
  player_id: string;
  player: {
    id: string;
    full_name: string | null;
    position: string | null;
    jersey_number: number | null;
    profile_image: string | null;
  };
};

type SpecialPlayer = {
  id: string;
  full_name: string;
  position: string | null;
  jersey_number: number | null;
  profile_image: string | null;
  age: number | null;
};

const AWARD_KEYS: SpecialAward["award_key"][] = [
  "kopa",
  "yashin",
  "gerd_muller",
  "socrates",
];

function SpecialAwardsSection() {
  const qc = useQueryClient();

  const awardsQ = useQuery({
    queryKey: ["special-awards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_awards")
        .select("*")
        .order("award_key");
      if (error) {
        console.error("[admin] failed to load special awards", error);
        toast.error("Couldn't load the special awards.", {
          id: "admin-special-awards",
        });
      }
      return data ?? [];
    },
  });

  const awards = (awardsQ.data ?? []) as SpecialAward[];

  // Includes age for client-side eligibility previews; the server re-checks
  // the rule on every nomination (see admin_nominate_player).
  const playersQ = useQuery({
    queryKey: ["special-award-players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, position, jersey_number, profile_image, age")
        .order("full_name");
      if (error) {
        console.error("[admin] failed to load players", error);
        toast.error("Couldn't load the players.", {
          id: "admin-special-players",
        });
      }
      return data ?? [];
    },
  });

  const statsQ = useQuery({
    queryKey: ["special-award-stats"],
    enabled: awards.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        awards.map(async (a) => {
          const { data, error } = await supabase.rpc(
            "get_special_award_stats",
            {
              _award_id: a.id,
            },
          );
          if (error) {
            console.error("[admin] failed to load award stats", error);
            toast.error(`Couldn't load stats for ${a.title}.`, {
              id: `admin-special-stats-${a.id}`,
            });
          }
          const row = (data ?? [])[0] as
            { vote_count: number; voter_count: number } | undefined;
          return [a.id, row ?? { vote_count: 0, voter_count: 0 }] as const;
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  async function createEdition() {
    const { error } = await supabase.rpc("admin_create_special_award_edition", {
      _year: 2027,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("PRC D'or 2027 special awards created");
    qc.invalidateQueries({ queryKey: ["special-awards"] });
    qc.invalidateQueries({ queryKey: ["periods"] });
  }

  if (awardsQ.isLoading) {
    return (
      <section className="glass-strong rounded-2xl p-6">
        <h2 className="mb-4 font-display text-2xl">Special Awards</h2>
        <div className="text-sm text-muted-foreground">Loading…</div>
      </section>
    );
  }

  if (awards.length === 0) {
    return (
      <section className="glass-strong rounded-2xl p-6">
        <h2 className="mb-1 flex items-center gap-2 font-display text-2xl">
          <Award className="h-5 w-5 text-gold" /> Special Awards — PRC D'or 2027
        </h2>
        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Creates the PRC D'or 2027 voting period and the four special awards
          (Kopa Trophy, Yashin Trophy, Gerd Müller Trophy, Socrates Award) with
          their default eligibility rules. You can adjust eligibility, nominate
          players and open voting below once created. Existing voting periods
          and all historical data are untouched.
        </p>
        <Button
          onClick={createEdition}
          className="bg-gold-gradient text-background hover:opacity-90"
        >
          <Plus className="mr-1 h-4 w-4" /> Create PRC D'or 2027 special awards
        </Button>
      </section>
    );
  }

  return (
    <section className="glass-strong rounded-2xl p-6">
      <h2 className="mb-1 flex items-center gap-2 font-display text-2xl">
        <Award className="h-5 w-5 text-gold" /> Special Awards — PRC D'or 2027
      </h2>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Configure eligibility, manage nominations, open voting and reveal
        results per award. Nominees: top-5 ballots score 5, 4, 3, 2, 1 points;
        ordering is per edition.
      </p>

      <div className="space-y-4">
        {awards.map((award) => (
          <AwardManageCard
            key={award.id}
            award={award}
            players={(playersQ.data ?? []) as SpecialPlayer[]}
            stats={
              (
                statsQ.data as
                  | Record<string, { vote_count: number; voter_count: number }>
                  | undefined
              )?.[award.id] ?? { vote_count: 0, voter_count: 0 }
            }
          />
        ))}
      </div>
    </section>
  );
}

function AwardManageCard({
  award,
  players,
  stats,
}: {
  award: SpecialAward;
  players: SpecialPlayer[];
  stats: { vote_count: number; voter_count: number };
}) {
  const qc = useQueryClient();

  const candidatesQ = useQuery({
    queryKey: ["special-award-candidates", award.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_award_candidates")
        .select(
          "id, award_id, player_id, player:player_id(id, full_name, position, jersey_number, profile_image)",
        )
        .eq("award_id", award.id);
      if (error) {
        console.error("[admin] failed to load nominations", error);
        toast.error(`Couldn't load nominees for ${award.title}.`, {
          id: `admin-special-candidates-${award.id}`,
        });
      }
      return data ?? [];
    },
  });

  const candidates = (candidatesQ.data ?? []) as unknown as SpecialCandidate[];
  const nominatedIds = new Set(candidates.map((c) => c.player_id));

  const [eligType, setEligType] = useState<SpecialAward["eligibility_type"]>(
    award.eligibility_type,
  );
  const [maxAge, setMaxAge] = useState<number | "">(
    award.eligibility_max_age ?? "",
  );
  const [eligPosition, setEligPosition] = useState<string>(
    award.eligibility_position ?? "",
  );
  const [pick, setPick] = useState<string>("");
  const [resetOpen, setResetOpen] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["special-award-candidates", award.id] });
    qc.invalidateQueries({ queryKey: ["special-awards"] });
    qc.invalidateQueries({ queryKey: ["special-award-stats"] });
  }

  function eligiblePlayers(): SpecialPlayer[] {
    return players.filter((p) => {
      if (nominatedIds.has(p.id)) return false;
      if (eligType === "by_position") return p.position === eligPosition;
      if (eligType === "max_age")
        return p.age != null && p.age <= Number(maxAge);
      return true;
    });
  }

  async function saveEligibility() {
    const { error } = await supabase.rpc(
      "admin_set_special_award_eligibility",
      {
        _award_id: award.id,
        _eligibility_type: eligType,
        _max_age: eligType === "max_age" ? Number(maxAge) : undefined,
        _position:
          eligType === "by_position" && eligPosition
            ? (eligPosition as Database["public"]["Enums"]["player_position"])
            : undefined,
      },
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Eligibility updated for ${award.title}`);
    refresh();
  }

  async function nominate() {
    if (!pick) return;
    const { error } = await supabase.rpc("admin_nominate_player", {
      _award_id: award.id,
      _player_id: pick,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setPick("");
    refresh();
  }

  async function removeNominee(playerId: string) {
    const { error } = await supabase.rpc("admin_remove_nominee", {
      _award_id: award.id,
      _player_id: playerId,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  }

  async function setStatus(votingOpen: boolean, resultsVisible: boolean) {
    const { error } = await supabase.rpc("admin_set_special_award_status", {
      _award_id: award.id,
      _voting_open: votingOpen,
      _results_visible: resultsVisible,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${award.title} updated`);
    refresh();
  }

  async function resetVotes() {
    const { error } = await supabase.rpc("admin_reset_special_votes", {
      _award_id: award.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Votes reset for ${award.title}`);
    refresh();
  }

  const pool = eligiblePlayers();

  return (
    <div className="rounded-xl border border-border p-4">
      {/* Header: title + stats + status toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display text-lg">{award.title}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {award.description ?? describeEligibility(award)} ·{" "}
            {candidates.length}/5+ nominees · {stats.voter_count} ballots ·{" "}
            {stats.vote_count} ranked picks
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            Voting
            <Switch
              checked={award.voting_open}
              onCheckedChange={(v) => setStatus(v, award.results_visible)}
            />
          </div>
          <div className="flex items-center gap-2">
            Live Results
            <Switch
              checked={award.results_visible}
              onCheckedChange={(v) => setStatus(award.voting_open, v)}
            />
          </div>
          <ResetButton
            onConfirm={resetVotes}
            disabled={stats.vote_count === 0}
          />
        </div>
      </div>

      {/* Eligibility configuration */}
      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-secondary/30 p-3">
        <div className="w-44">
          <Label>Eligibility rule</Label>
          <Select
            value={eligType}
            onValueChange={(v) =>
              setEligType(v as SpecialAward["eligibility_type"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All players</SelectItem>
              <SelectItem value="by_position">By position</SelectItem>
              <SelectItem value="max_age">Max age</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {eligType === "max_age" && (
          <div className="w-32">
            <Label>Max age</Label>
            <Input
              type="number"
              min={1}
              value={maxAge}
              onChange={(e) =>
                setMaxAge(e.target.value ? Number(e.target.value) : "")
              }
            />
          </div>
        )}
        {eligType === "by_position" && (
          <div className="w-44">
            <Label>Position</Label>
            <Select value={eligPosition} onValueChange={setEligPosition}>
              <SelectTrigger>
                <SelectValue placeholder="Select position" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Goalkeeper",
                  "Defender",
                  "Midfielder",
                  "Winger",
                  "Striker",
                ].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={saveEligibility}
          disabled={stats.vote_count > 0}
        >
          Save rule
        </Button>
        {stats.vote_count > 0 && (
          <span className="text-xs text-muted-foreground">
            Eligibility locked while ballots exist.
          </span>
        )}
      </div>

      {/* Nominations */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[260px] flex-1">
          <Label>Nominate player ({pool.length} eligible)</Label>
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger>
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              {pool.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                  {p.jersey_number ? ` (#${p.jersey_number})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          onClick={nominate}
          disabled={!pick || award.voting_open}
          className="bg-gold-gradient text-background hover:opacity-90"
        >
          <Plus className="mr-1 h-4 w-4" /> Nominate
        </Button>
        {award.voting_open && (
          <span className="text-xs text-muted-foreground">
            Voting is open: nominations are locked.
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {candidates.length === 0 && (
          <div className="text-sm text-muted-foreground">No nominees yet.</div>
        )}
        {candidates.map((c) => (
          <span
            key={c.id}
            className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 py-1 pl-1 pr-2 text-sm"
          >
            <PlayerAvatar
              path={c.player.profile_image}
              name={c.player.full_name ?? ""}
              className="h-7 w-7"
            />
            <span className="pr-1">{c.player.full_name}</span>
            <button
              className="rounded-full p-0.5 text-muted-foreground hover:text-destructive"
              onClick={() => removeNominee(c.player_id)}
              disabled={stats.vote_count > 0}
              title={
                stats.vote_count > 0
                  ? "Reset votes first to remove a nominee"
                  : "Remove nominee"
              }
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function describeEligibility(award: SpecialAward): string {
  switch (award.eligibility_type) {
    case "by_position":
      return `Eligible: ${award.eligibility_position}s only`;
    case "max_age":
      return `Eligible: age ≤ ${award.eligibility_max_age}`;
    default:
      return "Eligible: all players";
  }
}
