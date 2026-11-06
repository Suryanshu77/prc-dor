import {
  useEffect,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  Loader2,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  PLAYLIST,
  SERVER_MUSIC_SNAPSHOT,
  getMusicController,
} from "@/lib/music-player";

function formatTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface ControlButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
  pressed?: boolean;
  primary?: boolean;
  large?: boolean;
  disabled?: boolean;
}

function ControlButton({
  label,
  onClick,
  children,
  active = false,
  pressed,
  primary = false,
  large = false,
  disabled = false,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border transition-colors motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-spectrum-3/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "disabled:pointer-events-none disabled:opacity-40",
        primary
          ? cn(
              "border-transparent bg-spectrum-gradient text-background shadow-spectrum hover:opacity-90",
              large ? "h-12 w-12" : "h-9 w-9",
            )
          : cn(
              "h-9 w-9",
              active
                ? "border-spectrum-3/70 bg-spectrum-3/15 text-spectrum-3"
                : "border-spectrum-3/30 text-spectrum-3 hover:border-spectrum-3/70 hover:bg-spectrum-3/10",
            ),
      )}
    >
      {children}
    </button>
  );
}

/**
 * Website-wide soundtrack: one floating player, one audio element, mounted in
 * the root application shell so playback survives every internal navigation.
 */
export function MusicPlayer() {
  const state = useSyncExternalStore(
    (listener) => getMusicController().subscribe(listener),
    () => getMusicController().getSnapshot(),
    () => SERVER_MUSIC_SNAPSHOT,
  );
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dragTime, setDragTime] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
    getMusicController().hydrate();
  }, []);

  if (!mounted) return null;

  const controller = getMusicController();
  const track = PLAYLIST[state.trackIndex] ?? PLAYLIST[0];
  const isPlaying = state.status === "playing";
  const isLoading = state.status === "loading";
  const duration =
    Number.isFinite(state.duration) && state.duration > 0 ? state.duration : 0;
  const progress = dragTime ?? state.currentTime;
  const unavailable = state.unavailable;
  const collapsedLabel =
    state.hasStarted && track ? track.title : "PRC D'OR Soundtrack";

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && expanded) {
      event.stopPropagation();
      setExpanded(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="PRC D'OR music player"
      className="fixed right-3 bottom-3 z-40 sm:right-5 sm:bottom-5"
      onKeyDown={handleKeyDown}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {isPlaying && track
          ? `Now playing ${track.title} by ${track.artist}`
          : ""}
      </p>

      {expanded ? (
        <div className="w-[21rem] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-spectrum-gradient p-px shadow-[0_24px_70px_-24px_rgba(0,0,0,1)]">
          <div className="flex max-h-[calc(100dvh-7rem)] w-full flex-col overflow-hidden rounded-[15px] bg-[#050505]/95 backdrop-blur-xl">
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
              <span className="flex min-w-0 items-center gap-2">
                <Music2
                  className="h-4 w-4 shrink-0 text-gold"
                  aria-hidden="true"
                />
                <span className="truncate text-[10px] font-semibold tracking-[0.28em] text-gold-soft uppercase">
                  PRC D&apos;OR Soundtrack
                </span>
              </span>
              <button
                type="button"
                aria-label="Minimize music player"
                title="Minimize"
                onClick={() => setExpanded(false)}
                className="shrink-0 rounded-full p-1.5 text-spectrum-3 transition-colors hover:bg-spectrum-3/15 focus-visible:ring-2 focus-visible:ring-spectrum-3/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none motion-reduce:transition-none"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <div
              className="h-px shrink-0 bg-spectrum-gradient"
              aria-hidden="true"
            />

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <div className="min-w-0">
                <p className="truncate font-display text-lg text-gold-gradient">
                  {track?.title ?? "PRC D'OR Soundtrack"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {track?.artist ?? "Select a track"}
                </p>
              </div>

              {state.needsGesture ? (
                <p className="rounded-lg border border-spectrum-3/30 bg-spectrum-3/10 px-3 py-2 text-[11px] leading-relaxed text-spectrum-3">
                  Press play to start the soundtrack.
                </p>
              ) : null}

              {state.error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] leading-relaxed text-destructive-foreground"
                >
                  {state.error}
                </p>
              ) : null}

              <div className="space-y-1.5">
                <Slider
                  aria-label="Seek"
                  min={0}
                  max={duration > 0 ? duration : 1}
                  step={0.1}
                  value={[duration > 0 ? Math.min(progress, duration) : 0]}
                  onValueChange={(value) => setDragTime(value[0])}
                  onValueCommit={(value) => {
                    setDragTime(null);
                    controller.seek(value[0]);
                  }}
                  disabled={duration <= 0}
                />
                <div className="flex justify-between text-[10px] tracking-wider text-muted-foreground tabular-nums">
                  <span>{formatTime(progress)}</span>
                  <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-1">
                <ControlButton
                  label={state.shuffle ? "Shuffle on" : "Shuffle off"}
                  pressed={state.shuffle}
                  active={state.shuffle}
                  onClick={() => controller.toggleShuffle()}
                >
                  <Shuffle className="h-4 w-4" />
                </ControlButton>
                <ControlButton
                  label="Previous track"
                  onClick={() => controller.previous()}
                >
                  <SkipBack className="h-4 w-4" />
                </ControlButton>
                <ControlButton
                  label={isPlaying ? "Pause" : "Play"}
                  primary
                  large
                  onClick={() => controller.togglePlay()}
                >
                  {isLoading && state.hasStarted ? (
                    <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
                  ) : isPlaying ? (
                    <Pause className="h-5 w-5" fill="currentColor" />
                  ) : (
                    <Play className="h-5 w-5" fill="currentColor" />
                  )}
                </ControlButton>
                <ControlButton
                  label="Next track"
                  onClick={() => controller.next()}
                >
                  <SkipForward className="h-4 w-4" />
                </ControlButton>
                <ControlButton
                  label={
                    state.repeat === "off"
                      ? "Repeat off"
                      : state.repeat === "all"
                        ? "Repeat all"
                        : "Repeat one"
                  }
                  pressed={state.repeat !== "off"}
                  active={state.repeat !== "off"}
                  onClick={() => controller.cycleRepeat()}
                >
                  {state.repeat === "one" ? (
                    <Repeat1 className="h-4 w-4" />
                  ) : (
                    <Repeat className="h-4 w-4" />
                  )}
                </ControlButton>
              </div>

              <div className="flex items-center gap-2">
                <ControlButton
                  label={state.muted ? "Unmute" : "Mute"}
                  pressed={state.muted}
                  active={state.muted}
                  onClick={() => controller.toggleMute()}
                >
                  {state.muted ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </ControlButton>
                <Slider
                  aria-label="Volume"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[state.muted ? 0 : state.volume]}
                  onValueChange={(value) => controller.setVolume(value[0])}
                  className="flex-1"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.25em] text-muted-foreground uppercase">
                  <ListMusic
                    className="h-3.5 w-3.5 text-gold"
                    aria-hidden="true"
                  />
                  Playlist
                </div>
                <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto pr-1">
                  {PLAYLIST.map((item, index) => {
                    const active = index === state.trackIndex;
                    const isUnavailable = unavailable.includes(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => controller.select(index)}
                          disabled={isUnavailable && !active}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors motion-reduce:transition-none",
                            "focus-visible:ring-2 focus-visible:ring-spectrum-3/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none",
                            "disabled:pointer-events-none",
                            active
                              ? "bg-spectrum-3/15 text-spectrum-3"
                              : "text-foreground hover:bg-spectrum-3/10",
                            isUnavailable && "opacity-50",
                          )}
                        >
                          {active ? (
                            <span
                              className="absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-full bg-spectrum-gradient"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span className="w-4 shrink-0 text-right text-[10px] text-muted-foreground tabular-nums">
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">
                              {item.title}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {item.artist}
                            </span>
                          </span>
                          {isUnavailable ? (
                            <span className="shrink-0 text-[10px] text-destructive-foreground">
                              Unavailable
                            </span>
                          ) : active && isPlaying ? (
                            <span
                              className="flex h-3 shrink-0 items-end gap-0.5"
                              aria-hidden="true"
                            >
                              {[0, 1, 2].map((bar) => (
                                <span
                                  key={bar}
                                  className="w-0.5 animate-pulse rounded-full bg-current motion-reduce:animate-none"
                                  style={{
                                    height: `${60 + bar * 20}%`,
                                    animationDelay: `${bar * 0.18}s`,
                                  }}
                                />
                              ))}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-[calc(100vw-1.5rem)] rounded-full bg-spectrum-gradient p-px shadow-[0_18px_50px_-18px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-2 rounded-full bg-[#050505]/95 py-1.5 pr-1.5 pl-2 backdrop-blur-xl">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spectrum-gradient text-background"
              aria-hidden="true"
            >
              <Music2 className="h-4 w-4" />
            </span>
            <span
              className="min-w-0 max-w-[7.5rem] truncate text-xs font-medium tracking-wide text-gold sm:max-w-[13rem] sm:text-sm"
              title={
                track
                  ? `${track.title} — ${track.artist}`
                  : "PRC D'OR Soundtrack"
              }
            >
              {collapsedLabel}
            </span>
            <ControlButton
              label={isPlaying ? "Pause" : "Play"}
              primary
              onClick={() => controller.togglePlay()}
            >
              {isLoading && state.hasStarted ? (
                <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5" fill="currentColor" />
              )}
            </ControlButton>
            <button
              type="button"
              aria-label="Expand music player"
              aria-expanded={false}
              title="Expand"
              onClick={() => setExpanded(true)}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-spectrum-3/30 text-spectrum-3 transition-colors hover:border-spectrum-3/70 hover:bg-spectrum-3/10 focus-visible:ring-2 focus-visible:ring-spectrum-3/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:outline-none motion-reduce:transition-none"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
