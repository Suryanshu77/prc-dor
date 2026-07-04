import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import trophyImg from "@/assets/trophy-hero.jpg";
import { Trophy, Sparkles, Users, Vote } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PRC D'or — The Football Community Awards" },
      {
        name: "description",
        content:
          "Annual football community awards for PRC society. Vote for the player who deserves the PRC D'or.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[var(--gold)] opacity-10 blur-3xl" />
      </div>

      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg text-gold-gradient">PRC D'or</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Est. 2024
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="rounded-md bg-gold-gradient px-4 py-2 text-sm font-medium text-background shadow-gold transition hover:opacity-90"
          >
            Join the awards
          </Link>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-24">
        <div className="animate-fade-up">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-gold">
            <Sparkles className="h-3 w-3" /> PRC D'or 2026
          </div>
          <h1 className="font-display text-5xl leading-tight text-foreground md:text-7xl">
            Who deserves the <span className="text-gold-gradient">PRC D'or</span>?
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            The annual football community award of the PRC society. Sign up, rank your top ten, and
            crown the year's best player among 30+ legends of the pitch.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-md bg-gold-gradient px-6 py-3 font-medium text-background shadow-gold transition hover:opacity-90"
            >
              Create your player profile
            </Link>
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="rounded-md border border-border px-6 py-3 font-medium text-foreground hover:bg-secondary"
            >
              I already have an account
            </Link>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4 text-sm">
            {[
              { icon: Users, label: "30+ players" },
              { icon: Vote, label: "Top 10 ranking" },
              { icon: Trophy, label: "1 winner crowned" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="glass rounded-xl p-4">
                <Icon className="mb-2 h-5 w-5 text-gold" />
                <div className="text-foreground/90">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-full bg-[var(--gold)] opacity-20 blur-3xl" />
          <img
            src={trophyImg}
            alt="Golden football trophy"
            width={1536}
            height={1024}
            className="animate-float mx-auto max-h-[560px] w-auto rounded-2xl object-contain"
          />
        </div>
      </section>
    </div>
  );
}
