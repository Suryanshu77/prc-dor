import { useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Trophy, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

const WINNER_IMAGE = "/images/prc-dor-2026-winner.jpeg";
const ANNOUNCE_DELAY_MS = 700;

const CONFETTI_COLORS = ["#D4AF37", "#FFD700", "#F7E7B0", "#FFFFFF"];

const sideBurst = (delay: number, x: number, particleCount: number) => ({
  delay,
  options: {
    particleCount,
    spread: 55,
    angle: x < 0.5 ? 62 : 118,
    origin: { x, y: 0.8 },
    colors: CONFETTI_COLORS,
    scalar: 0.9,
    ticks: 220,
    gravity: 1.1,
    disableForReducedMotion: true,
  },
});

const CONFETTI_BURSTS = [
  sideBurst(0, 0.14, 26),
  sideBurst(0, 0.86, 26),
  sideBurst(360, 0.12, 20),
  sideBurst(360, 0.88, 20),
  sideBurst(720, 0.16, 16),
  sideBurst(720, 0.84, 16),
  {
    delay: 720,
    options: {
      particleCount: 18,
      spread: 100,
      origin: { x: 0.5, y: 0.34 },
      colors: CONFETTI_COLORS,
      scalar: 0.75,
      ticks: 200,
      gravity: 1.05,
      disableForReducedMotion: true,
    },
  },
];

export function PRCDor2026WinnerPopup() {
  const [open, setOpen] = useState(false);
  const announced = useRef(false);

  useEffect(() => {
    if (announced.current) return;
    let cancelled = false;
    let disposeConfetti: (() => void) | null = null;
    const burstTimers: number[] = [];

    const celebrate = async () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const { default: confetti } = await import("canvas-confetti");
      if (cancelled) return;

      const canvas = document.createElement("canvas");
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "60";
      document.body.appendChild(canvas);

      const instance = confetti.create(canvas, { resize: true });
      disposeConfetti = () => {
        instance.reset();
        canvas.remove();
      };

      for (const { delay, options } of CONFETTI_BURSTS) {
        burstTimers.push(window.setTimeout(() => instance(options), delay));
      }
    };

    const openTimer = window.setTimeout(() => {
      announced.current = true;
      setOpen(true);
      void celebrate();
    }, ANNOUNCE_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(openTimer);
      burstTimers.forEach((id) => window.clearTimeout(id));
      disposeConfetti?.();
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-background/85 backdrop-blur-sm" />
        <DialogPrimitive.Content className="prc-dor-winner-popup glass-strong duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl p-0 text-center shadow-glow outline-none">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-28 h-56 bg-[var(--gold)] opacity-20 blur-3xl"
          />

          <DialogPrimitive.Close asChild>
            <button
              type="button"
              aria-label="Close celebration"
              className="absolute right-3 top-3 z-10 rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogPrimitive.Close>

          <div className="relative flex flex-col items-center px-6 pb-7 pt-9 sm:px-8 sm:pt-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold">
              <Trophy className="h-6 w-6" />
            </div>

            <DialogTitle className="mt-4 font-display text-2xl leading-tight sm:text-3xl">
              <span className="block text-gold-gradient">
                PRC D&apos;OR 2026
              </span>
              <span className="mt-1.5 block text-[11px] uppercase tracking-[0.35em] text-gold-soft">
                Winner
              </span>
            </DialogTitle>

            <div className="relative mt-5">
              <div
                aria-hidden="true"
                className="absolute -inset-3 -z-10 rounded-[1.75rem] bg-[var(--gold)] opacity-25 blur-2xl"
              />
              <img
                src={WINNER_IMAGE}
                alt="Divyansh Tiwari, winner of the PRC D'OR 2026"
                width={1023}
                height={1537}
                className="aspect-[2/3] w-40 rounded-2xl border border-[var(--gold)]/30 object-cover object-top shadow-gold sm:w-48"
              />
            </div>

            <p className="mt-5 font-display text-xl font-bold uppercase tracking-[0.08em] text-foreground sm:text-2xl">
              Divyansh Tiwari
            </p>

            <DialogDescription className="mt-2 text-sm italic text-muted-foreground">
              &ldquo;Congratulations to the 2026 PRC D&apos;OR winner!&rdquo;
            </DialogDescription>

            <DialogClose asChild>
              <Button
                size="lg"
                className="mt-6 w-full max-w-xs bg-gold-gradient text-background shadow-gold hover:opacity-90"
              >
                Continue to PRC D&apos;OR
              </Button>
            </DialogClose>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
