import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/players")({
  head: () => ({ meta: [{ title: "Players — PRC D'or" }] }),
  component: PlayersPage,
});

const POSITIONS = ["All", "Goalkeeper", "Defender", "Midfielder", "Winger", "Striker"];

function PlayersPage() {
  const [q, setQ] = useState("");
  const [pos, setPos] = useState("All");

  const playersQ = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, nickname, position, jersey_number, profile_image")
        .order("full_name");
      return data ?? [];
    },
  });

  const list = (playersQ.data ?? []).filter(
    (p) =>
      (pos === "All" || p.position === pos) &&
      (q === "" ||
        p.full_name.toLowerCase().includes(q.toLowerCase()) ||
        (p.nickname ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">The Squad</h1>
        <p className="text-muted-foreground">All registered PRC D'or contenders.</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search players…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={pos} onValueChange={setPos}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <Link
            key={p.id}
            to="/players/$id"
            params={{ id: p.id }}
            className="group glass rounded-2xl p-5 text-center transition hover:shadow-gold hover:-translate-y-1"
          >
            <div className="mx-auto mb-4 inline-block">
              <PlayerAvatar path={p.profile_image} name={p.full_name} className="h-24 w-24" ring />
            </div>
            <div className="font-display text-lg">{p.full_name}</div>
            {p.nickname && (
              <div className="text-xs text-muted-foreground">"{p.nickname}"</div>
            )}
            <div className="mt-3 flex items-center justify-center gap-2 text-xs">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                {p.position ?? "—"}
              </span>
              {p.jersey_number && (
                <span className="rounded-full bg-gold-gradient px-2.5 py-1 font-medium text-background">
                  #{p.jersey_number}
                </span>
              )}
            </div>
          </Link>
        ))}
        {list.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            No players match your search.
          </div>
        )}
      </div>
    </div>
  );
}
