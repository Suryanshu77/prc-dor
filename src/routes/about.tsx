import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  Sparkles,
  TriangleAlert,
  Trophy,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — PRC D'or" },
      {
        name: "description",
        content:
          "What PRC D'OR is, the problem it solves, our solution and our vision — the story behind Purvanchal Royal City's community-driven football awards platform.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap",
      },
    ],
  }),
  component: () => (
    <AppShell>
      <AboutPage />
    </AppShell>
  ),
});

function Panel({
  children,
  className = "",
  delay = 0,
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  strong?: boolean;
}) {
  return (
    <section
      className={`${strong ? "glass-strong" : "glass"} animate-fade-up rounded-2xl p-5 transition-colors duration-300 hover:border-[var(--gold)]/35 motion-reduce:animate-none motion-reduce:transition-none md:p-6 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </section>
  );
}

function SectionTitle({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon?: typeof TriangleAlert;
}) {
  return (
    <h2 className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.25em] text-gold">
      <span
        aria-hidden="true"
        className="h-px w-5 shrink-0 bg-[var(--gold)]/70"
      />
      {Icon ? (
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      ) : null}
      {children}
    </h2>
  );
}

function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 md:space-y-5">
      {/* ── 1. Introduction / hero ──────────────────────────────────── */}
      <Panel strong delay={0} className="overflow-hidden">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <p className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.25em] text-gold">
              <span
                aria-hidden="true"
                className="h-px w-5 shrink-0 bg-[var(--gold)]/70"
              />
              About
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight text-foreground xl:text-4xl">
              The community award for{" "}
              <span className="text-gold-gradient">football greatness</span>
            </h1>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
              PRC D&apos;OR is a community-driven football recognition platform
              built specifically for Purvanchal Royal City — where the community
              votes, results stay transparent, and every season&apos;s story is
              preserved.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="inline-flex items-center gap-2 rounded-md bg-gold-gradient px-5 py-2.5 text-sm font-medium text-background shadow-gold transition hover:opacity-90"
              >
                Create your player profile
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="relative flex justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-full bg-[var(--gold)] opacity-20 blur-3xl"
            />
            <img
              src="/images/landing/prc-dor-trophy.png"
              alt="The PRC D'OR golden football trophy"
              width={1295}
              height={1214}
              className="max-h-56 w-auto object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)] sm:max-h-72 lg:max-h-80"
            />
          </div>
        </div>
      </Panel>

      {/* ── 2 + 3. The Problem · Our Solution ───────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel delay={60}>
          <SectionTitle icon={TriangleAlert}>The Problem</SectionTitle>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
            <p>
              In Purvanchal Royal City, football is a big part of our community.
              But recognizing the players who actually made an impact was
              largely informal.
            </p>
            <p>
              There wasn&apos;t a proper, transparent way for our football
              community to vote, track results, recognize outstanding players,
              and preserve the history of our awards.
            </p>
          </div>
        </Panel>

        <Panel delay={120}>
          <SectionTitle icon={Sparkles}>Our Solution</SectionTitle>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-foreground/90 sm:text-[0.95rem]">
            <p>
              PRC D&apos;OR is a community-driven football awards platform built
              specifically for Purvanchal Royal City.
            </p>
            <p>
              It brings voting, player profiles, results, leaderboards, and the
              Hall of Fame into one place — turning a community football award
              into a transparent, digital experience.
            </p>
          </div>
          <p className="mt-5 font-display text-sm text-foreground/90">
            Be part of the PRC D&apos;OR community.
          </p>
        </Panel>
      </div>

      {/* ── 4. Our Vision ───────────────────────────────────────────── */}
      <Panel delay={180}>
        <SectionTitle icon={Trophy}>Our Vision</SectionTitle>
        <div className="mt-4 max-w-prose space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
          <p>
            PRC D&apos;OR was built so recognition never has to stay informal
            again. Every vote is counted by the community, every result stays on
            record, and each season adds to a history anyone can return to.
          </p>
          <p>
            The long-term vision is simple: keep the award in the hands of the
            people who live the game, and keep the story of PRC D&apos;OR
            football — who was recognised, and how — transparent for seasons to
            come.
          </p>
        </div>
        <p className="mt-5 font-display text-base italic text-gold">
          Football greatness deserves more than a moment. It deserves a record.
        </p>
      </Panel>

      {/* ── 5. Creator ──────────────────────────────────────────────── */}
      <CreatorPanel delay={240} />
    </div>
  );
}

function CreatorPanel({ delay = 240 }: { delay?: number }) {
  const [imageOk, setImageOk] = useState(true);

  return (
    <Panel strong delay={delay}>
      <div className="grid items-center gap-5 sm:gap-6 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="flex justify-center">
          {imageOk ? (
            <img
              src="/images/creator-profile.png"
              alt="Suryanshu Saxena"
              onError={() => setImageOk(false)}
              className="h-28 w-28 rounded-full border border-[var(--gold)]/60 object-cover object-[center_25%] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] lg:h-32 lg:w-32"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-[var(--gold)]/60 bg-gold-gradient lg:h-32 lg:w-32">
              <span className="font-display text-3xl text-background">SS</span>
            </div>
          )}
        </div>

        <div className="text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <SectionTitle icon={UserRound}>The Creator</SectionTitle>
          </div>
          <h2 className="mt-3 font-display text-2xl leading-tight text-foreground xl:text-3xl">
            SURYANSHU <span className="text-gold-gradient">SAXENA</span>
          </h2>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.2em] text-foreground/65 sm:text-xs">
            Creator &amp; Developer of{" "}
            <span className="text-gold">PRC D&apos;OR</span>
          </p>
          <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground lg:mx-0">
            The mind behind PRC D&apos;OR. A developer passionate about
            technology, innovation and building meaningful digital experiences.
            I created PRC D&apos;OR to bring the excitement and prestige of
            football&apos;s biggest individual awards into an interactive
            experience.
          </p>
          <Link
            to="/the-creator"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-gold underline-offset-4 transition-colors hover:text-gold-soft hover:underline"
          >
            Meet the creator
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <span
          aria-hidden="true"
          className="select-none text-center text-2xl leading-[1.2] text-gold-gradient lg:text-3xl"
          style={{ fontFamily: '"Great Vibes", cursive' }}
        >
          Suryanshu Saxena
        </span>
      </div>
    </Panel>
  );
}
