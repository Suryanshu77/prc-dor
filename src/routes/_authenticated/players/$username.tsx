import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { PROFILE_COLUMNS } from "@/lib/use-profile";
import { useSignedUrl } from "@/lib/avatars";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { FollowRequestsPanel } from "@/components/profile/FollowRequestsPanel";
import {
  ArrowLeft,
  Award,
  Calendar,
  Flag,
  Hash,
  MapPin,
  Pencil,
  Shield,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/players/$username")({
  head: () => ({ meta: [{ title: "Player — PRC D'or" }] }),
  component: PlayerPage,
});

function PlayerPage() {
  const { username } = Route.useParams();
  // Handles are stored lowercase (DB CHECK + unique index); normalise the
  // param so /players/Ronaldo and /players/ronaldo resolve to one profile.
  const handle = username.toLowerCase();
  const { user } = useAuth();

  const profileQ = useQuery({
    queryKey: ["profile", "username", handle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_COLUMNS)
        .eq("username", handle)
        .maybeSingle();
      if (error) {
        console.error("[player] failed to load profile", error);
        toast.error("Couldn't load this profile.", {
          id: "player-profile",
        });
      }
      return data;
    },
  });

  const p = profileQ.data ?? null;
  const bannerUrl = useSignedUrl(p?.banner_image);
  const isOwn = !!user && !!p && user.id === p.id;

  // Shared ["active-period"] key — queryFn mirrors vote.tsx / dashboard.tsx /
  // use-voting-live.ts byte for byte (see the comment there): React Query
  // caches by key, so a narrower select would hand the other observers a row
  // missing the columns they read.
  const activePeriodQ = useQuery({
    queryKey: ["active-period"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("voting_periods")
        .select("*")
        .eq("is_active", true)
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error("[player] failed to load active period", error);
        toast.error("Couldn't load the voting period.", {
          id: "player-period",
        });
      }
      return data;
    },
  });

  // Period standing — the same RPC + shape the pre-restructure profile page
  // consumed (players.$id.tsx), pinned by tests/player-period-rank.test.mjs.
  const rankQ = useQuery({
    queryKey: ["player-period-rank", p?.id, activePeriodQ.data?.id],
    enabled: !!p && !!activePeriodQ.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_player_period_rank", {
        _player_id: p!.id,
        _period_id: activePeriodQ.data!.id,
      });
      if (error) {
        console.error("[player] failed to load rank", error);
        toast.error("Couldn't load this player's rank.", {
          id: "player-rank",
        });
      }
      return (data ?? [])[0] ?? null;
    },
  });

  const rankData = rankQ.data;

  if (profileQ.isLoading) {
    return (
      <div className="py-20 text-center text-muted-foreground">Loading…</div>
    );
  }
  if (!p) {
    return (
      <div className="space-y-6">
        <BackLink />
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="font-display text-xl">Player not found.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No member goes by @{handle} yet.
          </p>
        </div>
      </div>
    );
  }

  const displayName = p.nickname || p.full_name;
  const joined = new Date(p.created_at).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="overflow-hidden rounded-3xl glass-strong">
        {bannerUrl && (
          <div className="relative h-40 w-full overflow-hidden md:h-56">
            <img
              src={bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}

        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div
              className={
                bannerUrl
                  ? "-mt-16 flex flex-col items-center gap-4 sm:flex-row md:-mt-20"
                  : "flex flex-col items-center gap-4 sm:flex-row"
              }
            >
              <PlayerAvatar
                path={p.profile_image}
                name={displayName}
                className={`h-28 w-28 ${bannerUrl ? "ring-4 ring-background" : ""}`}
                ring={!bannerUrl}
              />
              <div className="text-center sm:text-left">
                <div className="text-xs uppercase tracking-[0.2em] text-gold">
                  PRC D&apos;or Player
                </div>
                <h1 className="mt-1 font-display text-4xl md:text-5xl">
                  {p.full_name}
                </h1>
                <div className="mt-1 text-muted-foreground">
                  {p.nickname ? `“${p.nickname}” · ` : ""}@{p.username}
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm sm:justify-start">
                  <Pill icon={MapPin}>{p.position ?? "Position —"}</Pill>
                  {p.jersey_number && (
                    <Pill icon={Hash}>#{p.jersey_number}</Pill>
                  )}
                  {p.age && <Pill>{p.age} yrs</Pill>}
                  <Pill icon={Calendar}>Joined {joined}</Pill>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              {isOwn ? <EditProfileLink /> : <FollowButton targetId={p.id} />}
            </div>
          </div>

          {p.bio && (
            <p className="mt-6 border-t border-border/50 pt-6 text-sm leading-relaxed text-muted-foreground">
              {p.bio}
            </p>
          )}

          <Favourites profile={p} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={Trophy}
          label="Current rank"
          value={rankData?.rank ? `#${rankData.rank}` : "—"}
        />
        <Stat
          icon={Award}
          label="Total points"
          value={rankData?.total_points ?? 0}
        />
        <Stat
          icon={Trophy}
          label="#1 votes"
          value={rankData?.first_place_votes ?? 0}
        />
      </div>

      {isOwn && <FollowRequestsPanel />}
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/players"
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> All players
    </Link>
  );
}

function EditProfileLink() {
  return (
    <Link
      to="/profile"
      search={{ edit: true }}
      className="inline-flex h-10 items-center justify-center rounded-md bg-gold-gradient px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
    >
      <Pencil className="mr-2 h-4 w-4" /> Edit profile
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Trophy;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <Icon className="h-4 w-4 text-gold" />
      </div>
      <div className="font-display text-3xl text-gold-gradient">{value}</div>
    </div>
  );
}

// Profile queries never select `email` (private), so the row shape used for
// rendering is the table row minus that column — same rule as /profile.
type ProfileRow = Omit<
  Database["public"]["Tables"]["profiles"]["Row"],
  "email"
>;

const FAVOURITES: {
  key:
    | "favourite_club"
    | "favourite_national_team"
    | "favourite_league"
    | "favourite_player";
  label: string;
  icon: typeof Shield;
}[] = [
  { key: "favourite_club", label: "Favourite club", icon: Shield },
  { key: "favourite_national_team", label: "National team", icon: Flag },
  { key: "favourite_league", label: "Favourite league", icon: Trophy },
  { key: "favourite_player", label: "Favourite player", icon: Star },
];

function Favourites({ profile }: { profile: ProfileRow }) {
  const entries = FAVOURITES.filter((f) => profile[f.key]);
  if (entries.length === 0 && !profile.favourite_moment) return null;

  return (
    <div className="mt-6 border-t border-border/50 pt-6">
      <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        Football favourites
      </h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.key} className="flex items-start gap-3">
            <entry.icon
              className="mt-0.5 h-4 w-4 shrink-0 text-gold"
              aria-hidden="true"
            />
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                {entry.label}
              </dt>
              <dd className="mt-0.5 text-sm">{profile[entry.key]}</dd>
            </div>
          </div>
        ))}
        {profile.favourite_moment && (
          <div className="flex items-start gap-3 sm:col-span-2">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-gold"
              aria-hidden="true"
            />
            <div>
              <dt className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Favourite football moment
              </dt>
              <dd className="mt-0.5 text-sm leading-relaxed">
                {profile.favourite_moment}
              </dd>
            </div>
          </div>
        )}
      </dl>
    </div>
  );
}

function Pill({
  icon: Icon,
  children,
}: {
  icon?: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-muted-foreground">
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </span>
  );
}
