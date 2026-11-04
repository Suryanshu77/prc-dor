import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AppShell } from "@/components/AppShell";
import type { LucideIcon } from "lucide-react";
import {
  Atom,
  Braces,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Code,
  DatabaseZap,
  ExternalLink,
  FileCode2,
  Pause,
  Play,
  Terminal,
  Wind,
  X,
} from "lucide-react";

export const Route = createFileRoute("/the-creator")({
  head: () => ({
    meta: [
      { title: "The Creator — PRC D'or" },
      {
        name: "description",
        content:
          "Meet Suryanshu Saxena, the creator and developer behind PRC D'or — the interactive football community awards platform.",
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
      <TheCreator />
    </AppShell>
  ),
});

const PORTFOLIO_URL = "https://suryanshu-portfolio-pink.vercel.app/";

const TECHS: { name: string; icon: LucideIcon }[] = [
  { name: "React", icon: Atom },
  { name: "TypeScript", icon: FileCode2 },
  { name: "JavaScript", icon: Braces },
  { name: "Python", icon: Terminal },
  { name: "C++", icon: Code },
  { name: "Supabase", icon: DatabaseZap },
  { name: "Tailwind CSS", icon: Wind },
  { name: "Cloudflare Workers", icon: Cloud },
];

const JOURNEY = [
  { title: "Initial Concept", desc: "The idea behind PRC D'OR." },
  { title: "PRC D'OR 2026", desc: "First voting edition." },
  {
    title: "Platform Expansion",
    desc: "Player profiles, personalization and Hall of Fame.",
  },
  {
    title: "PRC D'OR 2027",
    desc: "Continued development and expanded award experience.",
  },
];

const MEMORIES = [
  "/images/prc-memories/prc-memory-01.png",
  "/images/prc-memories/prc-memory-02.png",
  "/images/prc-memories/prc-memory-03.png",
  "/images/prc-memories/prc-memory-04.png",
  "/images/prc-memories/prc-memory-05.png",
  "/images/prc-memories/prc-memory-06.png",
  "/images/prc-memories/prc-memory-07.png",
];

const slideNumber = (n: number) => String(n).padStart(2, "0");

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

function Label({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.25em] text-gold ${className}`}
    >
      <span
        aria-hidden="true"
        className="h-px w-5 shrink-0 bg-[var(--gold)]/70"
      />
      {children}
    </p>
  );
}

function MemoriesSection({ delay = 180 }: { delay?: number }) {
  const count = MEMORIES.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [viewer, setViewer] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const touchStartX = useRef<number | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const goTo = (step: number) =>
    setIndex((current) => (current + step + count) % count);

  const openViewer = () => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setViewer(true);
  };

  const closeViewer = () => setViewer(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) setPlaying(false);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setPlaying(false);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const sync = () => setTabVisible(document.visibilityState === "visible");
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  useEffect(() => {
    if (!playing || viewer || !tabVisible) return;
    const timer = window.setTimeout(
      () => setIndex((i) => (i + 1) % count),
      5000,
    );
    return () => window.clearTimeout(timer);
  }, [playing, viewer, tabVisible, index, count]);

  useEffect(() => {
    if (!viewer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewer(false);
      else if (event.key === "ArrowRight")
        setIndex((i) => (i + 1) % MEMORIES.length);
      else if (event.key === "ArrowLeft")
        setIndex((i) => (i - 1 + MEMORIES.length) % MEMORIES.length);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      openerRef.current?.focus();
      openerRef.current = null;
    };
  }, [viewer]);

  const counter = (
    <span className="tabular-nums">
      {slideNumber(index + 1)} / {slideNumber(count)}
    </span>
  );

  const viewerDialog = viewer
    ? createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="PRC D'OR memories fullscreen viewer"
          onClick={closeViewer}
          onTouchStart={(event) => {
            touchStartX.current = event.changedTouches[0].clientX;
          }}
          onTouchEnd={(event) => {
            const startX = touchStartX.current;
            touchStartX.current = null;
            if (startX === null) return;
            const delta = event.changedTouches[0].clientX - startX;
            if (Math.abs(delta) > 48) goTo(delta < 0 ? 1 : -1);
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 motion-reduce:transition-none"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              closeViewer();
            }}
            aria-label="Close fullscreen viewer"
            className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--gold)]/40 bg-black/70 text-gold transition hover:border-[var(--gold)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] motion-reduce:transition-none sm:right-5 sm:top-5"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          <div
            className="flex max-h-full max-w-full items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={MEMORIES[index]}
              alt={`PRC D'OR memory photograph ${slideNumber(index + 1)} of ${slideNumber(count)}`}
              decoding="async"
              className="max-h-[82vh] max-w-[92vw] object-contain"
            />
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goTo(-1);
            }}
            aria-label="Previous photograph"
            className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)]/40 bg-black/70 text-gold transition hover:border-[var(--gold)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] motion-reduce:transition-none sm:left-5"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goTo(1);
            }}
            aria-label="Next photograph"
            className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--gold)]/40 bg-black/70 text-gold transition hover:border-[var(--gold)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] motion-reduce:transition-none sm:right-5"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs font-medium tracking-[0.2em] text-gold">
            <span aria-live="polite" className="tabular-nums">
              {slideNumber(index + 1)} / {slideNumber(count)}
            </span>
          </p>
        </div>,
        document.body,
      )
    : null;

  return (
    <Panel delay={delay}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Label>Memories of PRC</Label>
          <p className="mt-2 text-sm text-muted-foreground">
            A few moments worth remembering.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          aria-label={
            playing ? "Pause automatic slideshow" : "Play automatic slideshow"
          }
          aria-pressed={playing}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground/85 transition-colors duration-300 hover:border-[var(--gold)]/40 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] motion-reduce:transition-none"
        >
          {playing ? (
            <Pause className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
          ) : (
            <Play className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
          )}
          {playing ? "Pause" : "Play"}
        </button>
      </div>

      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl border border-[var(--gold)]/25 bg-black/40">
        {MEMORIES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`PRC D'OR memory photograph ${slideNumber(i + 1)} of ${slideNumber(count)}`}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            aria-hidden={i !== index}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <button
          type="button"
          onClick={openViewer}
          aria-label="View photograph fullscreen"
          className="absolute inset-0 z-10 cursor-zoom-in bg-gradient-to-t from-black/45 via-transparent to-transparent focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--gold)]"
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => goTo(-1)}
          aria-label="Previous photograph"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 text-foreground/85 transition-colors duration-300 hover:border-[var(--gold)]/40 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] motion-reduce:transition-none"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p className="min-w-[5.5rem] text-center text-xs font-medium tracking-[0.2em] text-muted-foreground">
          {counter}
        </p>
        <button
          type="button"
          onClick={() => goTo(1)}
          aria-label="Next photograph"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-card/40 text-foreground/85 transition-colors duration-300 hover:border-[var(--gold)]/40 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] motion-reduce:transition-none"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {viewerDialog}
    </Panel>
  );
}

function TheCreator() {
  const [imageOk, setImageOk] = useState(true);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4 md:space-y-5">
      {/* ── Hero: portrait · introduction · signature ─────────── */}
      <Panel strong delay={0}>
        <div className="grid items-center gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)_minmax(0,1fr)]">
          <div className="flex justify-center">
            {imageOk ? (
              <img
                src="/images/creator-profile.png"
                alt="Suryanshu Saxena"
                onError={() => setImageOk(false)}
                className="h-36 w-36 rounded-full border border-[var(--gold)]/60 object-cover object-[center_25%] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.6)] xl:h-44 xl:w-44"
              />
            ) : (
              <div className="flex h-36 w-36 items-center justify-center rounded-full border border-[var(--gold)]/60 bg-gold-gradient xl:h-44 xl:w-44">
                <span className="font-display text-4xl text-background">
                  SS
                </span>
              </div>
            )}
          </div>

          <div className="text-center lg:text-left">
            <Label className="justify-center lg:justify-start">
              The Creator
            </Label>
            <h1 className="mt-3 font-display text-3xl leading-tight text-foreground xl:text-4xl">
              SURYANSHU <span className="text-gold-gradient">SAXENA</span>
            </h1>
            <p className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-foreground/65 sm:text-xs">
              Creator &amp; Developer of{" "}
              <span className="text-gold">PRC D'OR</span>
            </p>
            <p className="mx-auto mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground lg:mx-0">
              The mind behind PRC D'OR. A developer passionate about technology,
              innovation and building meaningful digital experiences. I created
              PRC D'OR to bring the excitement and prestige of football's
              biggest individual awards into an interactive experience.
            </p>
          </div>

          <div className="flex justify-center">
            <span
              aria-hidden="true"
              className="select-none text-center text-2xl leading-[1.2] text-gold-gradient xl:text-3xl 2xl:text-4xl"
              style={{ fontFamily: '"Great Vibes", cursive' }}
            >
              Suryanshu Saxena
            </span>
          </div>
        </div>
      </Panel>

      {/* ── Row: Vision · Journey ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel delay={60}>
          <Label>Behind PRC D'OR</Label>
          <h2 className="mt-3 font-display text-xl text-foreground">
            Behind the Vision
          </h2>
          <div
            aria-hidden="true"
            className="mt-3 mb-4 h-px w-14 bg-gradient-to-r from-[var(--gold)] to-transparent"
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            PRC D'OR was created from a passion for football and an appreciation
            for the individual brilliance that makes the game special. The idea
            was to build a platform where football enthusiasts could participate
            in recognizing outstanding performances, celebrate exceptional
            players and experience the excitement of prestigious football awards
            through an interactive voting experience.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Beyond simply displaying results, the vision was to create an
            experience that makes every part of the awards feel meaningful. From
            discovering players and exploring special award categories to
            participating in the voting process, every element is designed to
            bring fans closer to the game. The goal is to make PRC D'OR more
            than just a voting platform — a place where football appreciation,
            competition and recognition come together.
          </p>
        </Panel>

        <Panel delay={100}>
          <Label>The Journey So Far</Label>
          <h2 className="mt-3 font-display text-xl text-foreground">
            The Journey
          </h2>
          <div
            aria-hidden="true"
            className="mt-3 mb-4 h-px w-14 bg-gradient-to-r from-[var(--gold)] to-transparent"
          />
          <ol className="border-l border-[var(--gold)]/30 pl-5">
            {JOURNEY.map((item) => (
              <li key={item.title} className="relative pb-4 last:pb-0">
                <span
                  aria-hidden="true"
                  className="absolute -left-6 top-1.5 h-2 w-2 rounded-full bg-gold"
                />
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      {/* ── Technology strip ──────────────────────────────────── */}
      <Panel delay={140}>
        <Label>Built With Technology</Label>
        <ul className="mt-4 flex flex-wrap gap-2">
          {TECHS.map(({ name, icon: Icon }) => (
            <li
              key={name}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-3 py-1.5 text-xs font-medium text-foreground/85 transition-colors duration-300 hover:border-[var(--gold)]/40 hover:text-gold motion-reduce:transition-none"
            >
              <Icon className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
              {name}
            </li>
          ))}
        </ul>
      </Panel>

      {/* ── Row: Memories · Beyond the Code ──────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <MemoriesSection delay={180} />

        <Panel delay={220}>
          <Label>A Little More About Me</Label>
          <h2 className="mt-3 font-display text-xl text-foreground">
            Beyond the Code
          </h2>
          <div
            aria-hidden="true"
            className="mt-3 mb-4 h-px w-14 bg-gradient-to-r from-[var(--gold)] to-transparent"
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Beyond writing code, I enjoy exploring new ideas, solving problems
            and turning concepts into working products. I believe great digital
            experiences come from combining thoughtful engineering with
            creativity and attention to detail.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Outside technology, football has always been a big part of my
            interests. I enjoy following the game, appreciating individual
            performances and discussing the moments that make football special.
            I also enjoy sports like skating and taekwondo, which have taught me
            the value of discipline, consistency and perseverance. These
            experiences shape how I approach challenges, both on and off the
            screen.
          </p>
        </Panel>
      </div>

      {/* ── Connect ───────────────────────────────────────────── */}
      <Panel
        delay={260}
        className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"
      >
        <div className="min-w-0">
          <Label>Let's Connect</Label>
          <h2 className="mt-3 font-display text-xl text-foreground">
            Let's Connect
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Discover more about my work, projects and experience.
          </p>
        </div>
        <a
          href={PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-gold-gradient px-6 py-3 text-sm font-semibold text-background shadow-gold transition-all duration-300 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] motion-reduce:transition-none md:w-auto"
        >
          Explore My Portfolio
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </Panel>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer
        className="animate-fade-up border-t border-border/50 pt-6 pb-2 text-center motion-reduce:animate-none"
        style={{ animationDelay: "300ms" }}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
          Conceived, Designed &amp; Developed by
        </p>
        <p className="mt-2.5 font-display text-lg text-gold-gradient sm:text-xl">
          SURYANSHU SAXENA
        </p>
        <p className="mt-2 text-xs italic text-muted-foreground">
          Built with passion for the beautiful game.
        </p>
      </footer>
    </div>
  );
}
