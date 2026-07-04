import AdminLayout from "@/components/admin/AdminLayout";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { toast } from "sonner";
import { Shield, Crown, RotateCcw, Trash2, Plus, Trophy } from "lucide-react";
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

          <h1 className="font-display text-4xl">
            Control room
          </h1>
        </header>

        <PeriodSection />

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
      const { data } = await supabase.from("voting_periods").select("*").order("year", { ascending: false });
      return data ?? [];
    },
  });

  async function toggle(id: string, active: boolean) {
    if (active) {
      await supabase.from("voting_periods").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    }
    await supabase.from("voting_periods").update({ is_active: active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["periods"] });
    qc.invalidateQueries({ queryKey: ["active-period"] });
    toast.success("Updated");
  }

  async function resetVotes(id: string) {
    const { error } = await supabase.from("votes").delete().eq("voting_period_id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Votes reset");
      qc.invalidateQueries();
    }
  }

  async function declareWinner(periodId: string) {
    const { data } = await supabase
      .from("player_results")
      .select("*")
      .order("total_points", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return toast.error("No results yet");
    const period = periodsQ.data?.find((p) => p.id === periodId);
    if (!period) return;
    await supabase
.from("voting_periods")
.update({
    winner_id: data.id,
    is_active: false,
    results_published: true,
})
.eq("id", periodId);
    await supabase.from("hall_of_fame").upsert(
      {
        year: period.year,
        winner_id: data.id,
        winner_name: data.full_name!,
        winner_image: data.profile_image,
        total_points: data.total_points,
      },
      { onConflict: "year" },
    );
    toast.success(`${data.full_name} crowned!`);
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
              <div className="font-display text-lg">
                {p.title}
              </div>

              <div className="text-xs text-muted-foreground">
                Year {p.year} · ends{" "}
                {p.ends_at
                  ? new Date(p.ends_at).toLocaleDateString()
                  : "—"}
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              Active
              <Switch
                checked={p.is_active}
                onCheckedChange={(v) => toggle(p.id, v)}
              />
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

function ResetButton({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <RotateCcw className="mr-1 h-4 w-4" /> Reset votes
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset all votes?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes every vote for this period. Players can vote again.
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
      const emailMap = new Map((emails ?? []).map((e: { id: string; email: string }) => [e.id, e.email]));
      return (profiles ?? []).map((p) => ({ ...p, email: emailMap.get(p.id) ?? "" }));
    },
  });


  async function remove(id: string) {
    if (!confirm("Remove this player profile? (Their auth account stays but their data is removed.)")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["admin-players"] });
    }
  }

  return (
    <section className="glass-strong rounded-2xl p-6">
      <h2 className="mb-4 font-display text-2xl">Players ({playersQ.data?.length ?? 0})</h2>
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
                    <PlayerAvatar path={p.profile_image} name={p.full_name} className="h-8 w-8" />
                    {p.full_name}
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.email}</td>
                <td className="px-3 py-2">{p.position}</td>
                <td className="px-3 py-2">{p.jersey_number ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
      { year, winner_name: winner, total_points: points || null, notes: notes || null },
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
          <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <Label>Winner name</Label>
          <Input value={winner} onChange={(e) => setWinner(e.target.value)} />
        </div>
        <div>
          <Label>Points</Label>
          <Input type="number" value={points} onChange={(e) => setPoints(e.target.value ? Number(e.target.value) : "")} />
        </div>
        <div className="sm:col-span-4">
          <Label>Notes</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>
      <Button className="mt-4 bg-gold-gradient text-background hover:opacity-90" onClick={add}>
        <Plus className="mr-1 h-4 w-4" /> Add entry
      </Button>
    </section>
  );
}
