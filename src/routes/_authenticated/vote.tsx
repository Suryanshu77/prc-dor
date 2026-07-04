import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { POINTS_BY_RANK } from "@/lib/points";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { GripVertical, Plus, X, AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/vote")({
  head: () => ({ meta: [{ title: "Vote — PRC D'or" }] }),
  component: VotePage,
});

type Player = {
  id: string;
  full_name: string;
  nickname: string | null;
  position: string | null;
  jersey_number: number | null;
  profile_image: string | null;
};

function VotePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

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

  const playersQ = useQuery({
    queryKey: ["players-vote"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, position, jersey_number, profile_image")
        .order("full_name");
      return (data ?? []) as Player[];
    },
  });

  const myVoteQ = useQuery({
    queryKey: ["my-vote", user?.id, periodQ.data?.id],
    enabled: !!user && !!periodQ.data,
    queryFn: async () => {
      const { data } = await supabase
        .from("votes")
        .select("*")
        .eq("voter_id", user!.id)
        .eq("voting_period_id", periodQ.data!.id);
      return data ?? [];
    },
  });

  const [ranking, setRanking] = useState<Player[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const eligible = useMemo(
    () => (playersQ.data ?? []).filter((p) => p.id !== user?.id),
    [playersQ.data, user],
  );

  const available = useMemo(
    () => eligible.filter((p) => !ranking.find((r) => r.id === p.id)),
    [eligible, ranking],
  );

  const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));

  const alreadyVoted = (myVoteQ.data ?? []).length > 0;

  if (periodQ.isLoading || playersQ.isLoading) {
    return <div className="py-20 text-center text-muted-foreground">Loading the voting booth…</div>;
  }
  if (!periodQ.data?.is_active) {
    return (
      <EmptyState
        title="Voting is closed"
        desc="The voting period isn't active right now. Check back soon!"
      />
    );
  }
  if (alreadyVoted) {
    return (
      <EmptyState
        title="Your vote is locked in"
        desc="You've already cast your PRC D'or vote. Head over to results to see how it's shaping up."
        cta={{ label: "View results", onClick: () => navigate({ to: "/results" }) }}
      />
    );
  }

  function add(p: Player) {
    if (ranking.length >= 10) {
      toast.error("You can only rank 10 players");
      return;
    }
    setRanking([...ranking, p]);
  }
  function remove(id: string) {
    setRanking(ranking.filter((p) => p.id !== id));
  }
  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = ranking.findIndex((p) => p.id === active.id);
    const newIdx = ranking.findIndex((p) => p.id === over.id);
    setRanking(arrayMove(ranking, oldIdx, newIdx));
  }

  async function submit() {
    if (ranking.length !== 10) {
      toast.error("Rank exactly 10 players");
      return;
    }
    setSubmitting(true);
    const rows = ranking.map((p, i) => ({
      voter_id: user!.id,
      ranked_player_id: p.id,
      rank_position: i + 1,
      points: POINTS_BY_RANK[i + 1],
      voting_period_id: periodQ.data!.id,
    }));
    const { error } = await supabase.from("votes").insert(rows);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Vote submitted — thank you!");
    qc.invalidateQueries({ queryKey: ["my-vote"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    navigate({ to: "/results" });
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="text-xs uppercase tracking-[0.2em] text-gold">Cast your vote</div>
        <h1 className="font-display text-4xl">Rank your Top 10</h1>
        <p className="mt-1 text-muted-foreground">
          Drag to reorder. 1st = 15 pts · 2nd = 12 · 3rd = 10 · 4th = 8 · 5th = 7 · 6th = 6 · 7th =
          5 · 8th = 4 · 9th = 3 · 10th = 2. You can't vote for yourself.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Ranking */}
        <div className="glass-strong rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg">Your ranking ({ranking.length}/10)</h2>
            {ranking.length > 0 && (
              <button
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setRanking([])}
              >
                Clear
              </button>
            )}
          </div>

          {ranking.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Add players from the right to start your top 10.
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={ranking.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-2">
                  {ranking.map((p, i) => (
                    <SortableRow key={p.id} player={p} index={i} onRemove={() => remove(p.id)} />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={ranking.length !== 10}
            className="mt-5 w-full bg-gold-gradient text-background hover:opacity-90"
          >
            Submit final ranking
          </Button>
        </div>

        {/* Available */}
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 font-display text-lg">Available players</h2>
          <div className="grid max-h-[600px] gap-2 overflow-y-auto pr-2">
            {available.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                disabled={ranking.length >= 10}
                className="group flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-left transition hover:border-[var(--gold)] disabled:opacity-40"
              >
                <PlayerAvatar path={p.profile_image} name={p.full_name} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{p.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.position} {p.jersey_number ? `· #${p.jersey_number}` : ""}
                  </div>
                </div>
                <Plus className="h-4 w-4 text-gold opacity-0 transition group-hover:opacity-100" />
              </button>
            ))}
            {available.length === 0 && (
              <div className="text-center text-sm text-muted-foreground">
                Everyone's been ranked.
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <AlertTriangle className="h-5 w-5 text-gold" /> Confirm your vote
            </DialogTitle>
            <DialogDescription>
              Are you sure? Votes cannot be changed after submission.
            </DialogDescription>
          </DialogHeader>
          <ol className="max-h-72 space-y-1 overflow-y-auto text-sm">
            {ranking.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5">
                <span>
                  <span className="text-gold">#{i + 1}</span> {p.full_name}
                </span>
                <span className="text-xs text-muted-foreground">{POINTS_BY_RANK[i + 1]} pts</span>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Go back
            </Button>
            <Button
              onClick={submit}
              disabled={submitting}
              className="bg-gold-gradient text-background hover:opacity-90"
            >
              <Check className="mr-1 h-4 w-4" /> {submitting ? "Submitting…" : "Confirm vote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableRow({
  player,
  index,
  onRemove,
}: {
  player: Player;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-[var(--gold)]/30 bg-secondary/30 p-3"
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient font-display text-sm text-background">
        {index + 1}
      </div>
      <PlayerAvatar path={player.profile_image} name={player.full_name} className="h-10 w-10" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{player.full_name}</div>
        <div className="text-xs text-muted-foreground">{player.position}</div>
      </div>
      <div className="text-sm font-medium text-gold">{POINTS_BY_RANK[index + 1]} pts</div>
      <button onClick={onRemove} className="rounded-md p-1 text-muted-foreground hover:text-destructive">
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

function EmptyState({
  title,
  desc,
  cta,
}: {
  title: string;
  desc: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="mx-auto mt-12 max-w-md rounded-2xl glass-strong p-8 text-center">
      <h2 className="font-display text-2xl text-gold-gradient">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
      {cta && (
        <Button className="mt-5 bg-gold-gradient text-background hover:opacity-90" onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
    </div>
  );
}
