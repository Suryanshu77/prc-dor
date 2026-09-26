import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sparkles, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";

const INTRO_DELAY_MS = 600;

export function PRCDorIntroPopup() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current || loading || user) return;
    triggered.current = true;
    const timer = window.setTimeout(() => setOpen(true), INTRO_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loading, user]);

  if (loading || user) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-background/85 backdrop-blur-sm" />
        <DialogPrimitive.Content className="prc-dor-intro-popup glass-strong duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl p-0 shadow-glow outline-none">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-28 h-56 bg-[var(--gold)] opacity-20 blur-3xl"
          />

          <DialogPrimitive.Close asChild>
            <button
              type="button"
              aria-label="Close"
              className="absolute right-3 top-3 z-10 rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogPrimitive.Close>

          <div className="relative px-6 pb-7 pt-8 sm:px-8 sm:pt-9">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-[0.35em] text-gold-soft">
                Welcome
              </p>
              <DialogTitle className="mt-1.5 font-display text-2xl leading-tight text-gold-gradient sm:text-3xl">
                What is PRC D&apos;OR?
              </DialogTitle>
            </div>

            <DialogDescription asChild>
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                <section className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <h2 className="flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-dim">
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                    The Problem
                  </h2>
                  <p className="mt-2">
                    In Purvanchal Royal City, football is a big part of our
                    community. But recognizing the players who actually made an
                    impact was largely informal.
                  </p>
                  <p className="mt-2">
                    There wasn&apos;t a proper, transparent way for our football
                    community to vote, track results, recognize outstanding
                    players, and preserve the history of our awards.
                  </p>
                </section>

                <section className="rounded-2xl border border-gold/25 bg-accent/20 p-4">
                  <h2 className="flex items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft">
                    <Sparkles className="h-3.5 w-3.5 shrink-0" />
                    The Solution
                  </h2>
                  <p className="mt-2 text-foreground/90">
                    PRC D&apos;OR is a community-driven football awards platform
                    built specifically for Purvanchal Royal City.
                  </p>
                  <p className="mt-2 text-foreground/90">
                    It brings voting, player profiles, results, leaderboards,
                    and the Hall of Fame into one place — turning a community
                    football award into a transparent, digital experience.
                  </p>
                </section>

                <p className="pt-1 text-center font-display text-sm text-foreground/90">
                  Be part of the PRC D&apos;OR community.
                </p>
              </div>
            </DialogDescription>

            <div className="mt-6 space-y-2.5">
              <DialogClose asChild>
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-gold-gradient text-background shadow-gold hover:opacity-90"
                >
                  <Link to="/auth" search={{ mode: "signup" }}>
                    Create Account
                  </Link>
                </Button>
              </DialogClose>

              <DialogClose asChild>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full border-border bg-background/60 hover:bg-secondary"
                >
                  <Link to="/auth" search={{ mode: "login" }}>
                    Sign In
                  </Link>
                </Button>
              </DialogClose>

              <div className="pt-1.5 text-center">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-sm text-xs text-muted-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    Continue as visitor
                  </button>
                </DialogClose>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
