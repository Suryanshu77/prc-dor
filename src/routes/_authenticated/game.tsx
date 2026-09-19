import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/game")({
  head: () => ({ meta: [{ title: "Game — PRC D'or" }] }),
  component: Game,
});

function Game() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="rounded-2xl glass-strong p-14 text-center shadow-gold">
        <p className="font-display text-2xl leading-snug text-gold-gradient">
          PRC FC Mobile Game is under construction and soon will be launched
        </p>
      </div>
    </div>
  );
}
