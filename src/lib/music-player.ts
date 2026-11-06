/**
 * PRC D'OR soundtrack controller.
 *
 * A single HTMLAudioElement is created lazily and kept for the whole life of
 * the document (the singleton is parked on `window`), so client-side
 * navigation can never spawn a second audio instance or restart the track.
 *
 * The controller is framework agnostic; the floating UI subscribes to it with
 * `useSyncExternalStore`.
 */

export type RepeatMode = "off" | "all" | "one";
export type PlaybackStatus =
  "idle" | "loading" | "playing" | "paused" | "error";

export interface PlaylistTrack {
  id: string;
  title: string;
  artist: string;
  /** Exact file name inside `public/audio/` — never renamed or moved. */
  file: string;
}

/**
 * The soundtrack in the requested order. Entries are only added for files that
 * actually exist in `public/audio/`; missing songs are reported, never faked.
 */
export const PLAYLIST: PlaylistTrack[] = [
  {
    id: "bad-boy",
    title: "Bad Boy",
    artist: "Marwa Loud",
    file: "Marwa Loud - Bad Boy (Lyrics).m4a",
  },
  {
    id: "one-kiss",
    title: "One Kiss",
    artist: "Dua Lipa",
    file: "One Kiss (with Dua Lipa) - Calvin Harris.m4a",
  },
  {
    id: "viva-la-vida",
    title: "Viva La Vida",
    artist: "Coldplay",
    file: "Coldplay - Viva La Vida.m4a",
  },
  {
    id: "waka-waka",
    title: "Waka Waka",
    artist: "Shakira",
    file: "Waka Waka - Shakira.m4a",
  },
  {
    id: "dai-dai",
    title: "Dai Dai",
    artist: "Shakira",
    file: "Dai Dai · Shakira · Burna Boy - SANTZADA© - SoundLoadMate.com (3).m4a",
  },
  {
    id: "la-la-la",
    title: "La La La",
    artist: "Shakira",
    file: "LA_LA_LA_-_shakira_(mp3.pm).m4a",
  },
  {
    id: "dreamers",
    title: "Dreamers",
    artist: "Jung Kook",
    file: "Dreamers (JungKook)  study motivation from kdramas.m4a",
  },
];

const AUDIO_DIR = `${import.meta.env.BASE_URL.replace(/\/+$/, "")}/audio/`;

/** Base-aware, percent-encoded URL for a file in `public/audio/`. */
export function trackUrl(file: string): string {
  return encodeURI(`${AUDIO_DIR}${file}`);
}

export interface MusicSnapshot {
  /** localStorage has been read (client only). */
  hydrated: boolean;
  /** The visitor has started (or restored) playback at least once. */
  hasStarted: boolean;
  trackIndex: number;
  status: PlaybackStatus;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Playback was requested but the browser autoplay policy blocked it. */
  needsGesture: boolean;
  error: string | null;
  /** Track ids whose audio failed to load or decode. */
  unavailable: readonly string[];
}

const DEFAULT_SNAPSHOT: MusicSnapshot = Object.freeze({
  hydrated: false,
  hasStarted: false,
  trackIndex: 0,
  status: "idle",
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  shuffle: false,
  repeat: "off",
  needsGesture: false,
  error: null,
  unavailable: Object.freeze([]) as readonly string[],
});

/** Stable server snapshot — never mutated, never re-created. */
export const SERVER_MUSIC_SNAPSHOT: MusicSnapshot = DEFAULT_SNAPSHOT;

const STORAGE_KEY = "prcdor.music.v1";

interface PersistedMusic {
  enabled: boolean;
  trackIndex: number;
  position: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeRepeat(value: unknown): RepeatMode {
  return value === "all" || value === "one" ? value : "off";
}

function readPersisted(): PersistedMusic | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedMusic>;
    const trackIndex =
      typeof parsed.trackIndex === "number" &&
      Number.isFinite(parsed.trackIndex)
        ? parsed.trackIndex
        : 0;
    const position =
      typeof parsed.position === "number" && Number.isFinite(parsed.position)
        ? parsed.position
        : 0;
    const volume =
      typeof parsed.volume === "number" && Number.isFinite(parsed.volume)
        ? parsed.volume
        : 0.8;
    return {
      enabled: parsed.enabled === true,
      trackIndex,
      position,
      volume: clamp(volume, 0, 1),
      muted: parsed.muted === true,
      shuffle: parsed.shuffle === true,
      repeat: normalizeRepeat(parsed.repeat),
    };
  } catch {
    return null;
  }
}

class MusicController {
  private listeners = new Set<() => void>();
  private state: MusicSnapshot = { ...DEFAULT_SNAPSHOT, unavailable: [] };
  private audio: HTMLAudioElement | null = null;
  private loadedTrackId: string | null = null;
  private hydrated = false;
  private destroyed = false;
  /** Last explicit preference: on after Play, off after an explicit Pause. */
  private enabled = false;
  /** Desired playback state — stays true while the tab is suspended. */
  private wantPlaying = false;
  /** The tab is hidden and playback was paused on purpose. */
  private suspended = false;
  private pendingSeek: number | null = null;
  private skipAttempts = 0;
  private lastPersistAt = 0;
  private onVisibility: (() => void) | null = null;
  private onPageHide: (() => void) | null = null;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): MusicSnapshot => this.state;

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private patch(next: Partial<MusicSnapshot>): void {
    this.state = { ...this.state, ...next };
    this.emit();
  }

  /* ------------------------------------------------------------------ *
   * Lifecycle
   * ------------------------------------------------------------------ */

  hydrate(): void {
    if (this.hydrated || typeof window === "undefined" || this.destroyed) {
      return;
    }
    this.hydrated = true;

    const saved = readPersisted();
    if (saved) {
      const trackIndex = clamp(
        Math.trunc(saved.trackIndex),
        0,
        Math.max(0, PLAYLIST.length - 1),
      );
      this.enabled = saved.enabled;
      if (saved.position > 0.5) this.pendingSeek = saved.position;
      this.state = {
        ...this.state,
        hydrated: true,
        trackIndex,
        volume: saved.volume,
        muted: saved.muted,
        shuffle: saved.shuffle,
        repeat: saved.repeat,
        hasStarted: saved.enabled || saved.position > 0.5,
      };
      this.emit();
      const audio = this.ensureAudio();
      if (audio) {
        audio.volume = this.state.volume;
        audio.muted = this.state.muted;
      }
    } else {
      this.patch({ hydrated: true });
    }

    this.attachLifecycleListeners();

    // Only a previously enabled visitor is asked to resume. Browsers may
    // still refuse (autoplay policy) — `play()` reports that as needsGesture.
    if (this.enabled) this.play();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.onVisibility && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.onVisibility);
    }
    if (this.onPageHide && typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.onPageHide);
    }
    this.onVisibility = null;
    this.onPageHide = null;
    const audio = this.audio;
    if (audio) {
      audio.removeEventListener("loadstart", this.handleLoadStart);
      audio.removeEventListener("loadedmetadata", this.handleLoadedMetadata);
      audio.removeEventListener("durationchange", this.handleDurationChange);
      audio.removeEventListener("playing", this.handlePlaying);
      audio.removeEventListener("pause", this.handlePause);
      audio.removeEventListener("waiting", this.handleWaiting);
      audio.removeEventListener("timeupdate", this.handleTimeUpdate);
      audio.removeEventListener("seeked", this.handleSeeked);
      audio.removeEventListener("ended", this.handleEnded);
      audio.removeEventListener("error", this.handleError);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      this.audio = null;
    }
    this.loadedTrackId = null;
    this.listeners.clear();
  }

  private attachLifecycleListeners(): void {
    if (typeof document === "undefined" || this.onVisibility) return;

    this.onVisibility = () => {
      if (this.destroyed) return;
      if (document.visibilityState === "hidden") {
        if (this.wantPlaying && this.audio && !this.audio.paused) {
          this.suspended = true;
          this.audio.pause();
          this.patch({ status: "paused" });
        }
      } else if (this.suspended) {
        this.suspended = false;
        if (this.wantPlaying) void this.startPlayback();
      }
    };
    document.addEventListener("visibilitychange", this.onVisibility);

    this.onPageHide = () => {
      if (!this.destroyed) this.persist();
    };
    window.addEventListener("pagehide", this.onPageHide);
  }

  /* ------------------------------------------------------------------ *
   * Audio element
   * ------------------------------------------------------------------ */

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof window === "undefined" || this.destroyed) return null;
    if (this.audio) return this.audio;

    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = this.state.volume;
    audio.muted = this.state.muted;

    audio.addEventListener("loadstart", this.handleLoadStart);
    audio.addEventListener("loadedmetadata", this.handleLoadedMetadata);
    audio.addEventListener("durationchange", this.handleDurationChange);
    audio.addEventListener("playing", this.handlePlaying);
    audio.addEventListener("pause", this.handlePause);
    audio.addEventListener("waiting", this.handleWaiting);
    audio.addEventListener("timeupdate", this.handleTimeUpdate);
    audio.addEventListener("seeked", this.handleSeeked);
    audio.addEventListener("ended", this.handleEnded);
    audio.addEventListener("error", this.handleError);

    this.audio = audio;
    return audio;
  }

  private ensureTrack(index: number, force = false): HTMLAudioElement | null {
    const audio = this.ensureAudio();
    if (!audio) return null;
    const track = PLAYLIST[index];
    if (!track) return null;
    if (force || this.loadedTrackId !== track.id) {
      this.loadedTrackId = track.id;
      audio.src = trackUrl(track.file);
    }
    return audio;
  }

  /* ------------------------------------------------------------------ *
   * Transport
   * ------------------------------------------------------------------ */

  play(): void {
    if (typeof window === "undefined" || this.destroyed) return;
    this.enabled = true;
    this.wantPlaying = true;
    this.suspended = false;
    this.patch({ needsGesture: false, error: null, status: "loading" });
    if (!this.ensureTrack(this.state.trackIndex)) {
      this.patch({ status: "error", error: "No soundtrack track available." });
      return;
    }
    this.persist();
    void this.startPlayback();
  }

  pause(): void {
    this.enabled = false;
    this.wantPlaying = false;
    this.suspended = false;
    this.audio?.pause();
    this.patch({ status: "paused", needsGesture: false });
    this.persist();
  }

  togglePlay(): void {
    if (this.wantPlaying) this.pause();
    else this.play();
  }

  select(index: number): void {
    const track = PLAYLIST[index];
    if (!track || this.destroyed) return;

    const isCurrent = index === this.state.trackIndex;
    if (isCurrent && this.state.status === "playing") return;

    if (isCurrent) {
      // Retry a track that previously failed, otherwise resume it.
      if (this.state.unavailable.includes(track.id)) {
        this.patch({
          unavailable: this.state.unavailable.filter((id) => id !== track.id),
          error: null,
        });
        this.loadedTrackId = null;
      }
      this.play();
      return;
    }

    this.skipAttempts = 0;
    this.pendingSeek = null;
    this.loadedTrackId = null;
    this.patch({
      trackIndex: index,
      currentTime: 0,
      duration: 0,
      error: null,
      status: "loading",
      unavailable: this.state.unavailable.filter((id) => id !== track.id),
    });
    this.play();
  }

  next(): void {
    const total = PLAYLIST.length;
    if (total === 0) return;
    const index =
      this.state.shuffle && total > 1
        ? this.randomOtherIndex()
        : (this.state.trackIndex + 1) % total;
    if (index === this.state.trackIndex) {
      this.seek(0);
      return;
    }
    this.select(index);
  }

  previous(): void {
    const total = PLAYLIST.length;
    if (total === 0) return;
    if (this.state.currentTime > 3) {
      this.seek(0);
      return;
    }
    const index = (this.state.trackIndex - 1 + total) % total;
    if (index === this.state.trackIndex) {
      this.seek(0);
      return;
    }
    this.select(index);
  }

  seek(seconds: number): void {
    const audio = this.audio;
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : null;
    const target = clamp(
      seconds,
      0,
      duration !== null && duration > 0 ? duration : Number.MAX_SAFE_INTEGER,
    );
    if (duration !== null && duration > 0) this.pendingSeek = null;
    try {
      audio.currentTime = target;
    } catch {
      return;
    }
    this.patch({ currentTime: target });
    this.persist();
  }

  setVolume(value: number): void {
    const volume = clamp(value, 0, 1);
    const muted = volume > 0 ? false : this.state.muted;
    if (this.audio) {
      this.audio.volume = volume;
      this.audio.muted = muted;
    }
    this.patch({ volume, muted });
    this.persist();
  }

  toggleMute(): void {
    const muted = !this.state.muted;
    if (this.audio) this.audio.muted = muted;
    this.patch({ muted });
    this.persist();
  }

  toggleShuffle(): void {
    const shuffle = !this.state.shuffle;
    this.patch({ shuffle });
    this.persist();
  }

  cycleRepeat(): void {
    const repeat: RepeatMode =
      this.state.repeat === "off"
        ? "all"
        : this.state.repeat === "all"
          ? "one"
          : "off";
    this.patch({ repeat });
    this.persist();
  }

  /* ------------------------------------------------------------------ *
   * Internals
   * ------------------------------------------------------------------ */

  private async startPlayback(): Promise<void> {
    const audio = this.ensureTrack(this.state.trackIndex);
    if (!audio || this.destroyed) return;

    // Restart cleanly when play is requested at (or past) the end.
    if (
      audio.ended ||
      (Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        audio.currentTime >= audio.duration - 0.05)
    ) {
      try {
        audio.currentTime = 0;
      } catch {
        /* ignore */
      }
      this.patch({ currentTime: 0 });
    }

    try {
      await audio.play();
      if (!audio.paused && !this.destroyed) {
        this.patch({
          status: "playing",
          hasStarted: true,
          needsGesture: false,
          error: null,
        });
      }
    } catch (err) {
      if (this.destroyed) return;
      const name = (err as { name?: string } | null)?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        // Autoplay policy blocked us — never bypass it, just ask for a gesture.
        this.wantPlaying = false;
        this.patch({ status: "paused", needsGesture: true });
        this.persist();
        return;
      }
      if (name === "AbortError") return;
      this.handleTrackFailure();
    }
  }

  private randomOtherIndex(): number {
    const total = PLAYLIST.length;
    if (total <= 1) return this.state.trackIndex;
    let index = this.state.trackIndex;
    for (let i = 0; i < 12 && index === this.state.trackIndex; i += 1) {
      index = Math.floor(Math.random() * total);
    }
    return index;
  }

  private pickAlternateIndex(): number | null {
    const total = PLAYLIST.length;
    const start = this.state.trackIndex;
    for (let step = 1; step <= total; step += 1) {
      const index = (start + step) % total;
      if (index === start) continue;
      if (!this.state.unavailable.includes(PLAYLIST[index].id)) return index;
    }
    return null;
  }

  private handleTrackFailure(): void {
    const track = PLAYLIST[this.state.trackIndex];
    if (!track) return;

    const unavailable = this.state.unavailable.includes(track.id)
      ? this.state.unavailable
      : [...this.state.unavailable, track.id];

    this.patch({
      status: "error",
      error: `“${track.title}” can't be played right now.`,
      unavailable,
    });
    this.persist();

    if (!this.wantPlaying) return;

    if (this.skipAttempts + 1 >= PLAYLIST.length) {
      this.wantPlaying = false;
      this.enabled = false;
      this.patch({ error: "No playable tracks in the soundtrack." });
      this.persist();
      return;
    }

    this.skipAttempts += 1;
    const next = this.pickAlternateIndex();
    if (next === null) {
      this.wantPlaying = false;
      this.enabled = false;
      this.patch({ error: "No playable tracks in the soundtrack." });
      this.persist();
      return;
    }
    this.select(next);
  }

  private persist(): void {
    if (typeof localStorage === "undefined") return;
    const position =
      this.audio && Number.isFinite(this.audio.currentTime)
        ? this.audio.currentTime
        : this.state.currentTime;
    const payload: PersistedMusic = {
      enabled: this.enabled,
      trackIndex: this.state.trackIndex,
      position,
      volume: this.state.volume,
      muted: this.state.muted,
      shuffle: this.state.shuffle,
      repeat: this.state.repeat,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* storage unavailable (private mode / quota) — playback still works */
    }
  }

  /* ------------------------------------------------------------------ *
   * Media events
   * ------------------------------------------------------------------ */

  private handleLoadStart = (): void => {
    if (this.wantPlaying) this.patch({ status: "loading" });
  };

  private handleLoadedMetadata = (): void => {
    const audio = this.audio;
    if (!audio) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    this.patch({ duration });
    if (this.pendingSeek !== null && duration > 0) {
      const target = clamp(this.pendingSeek, 0, Math.max(0, duration - 0.25));
      this.pendingSeek = null;
      try {
        audio.currentTime = target;
      } catch {
        return;
      }
      this.patch({ currentTime: target });
    }
  };

  private handleDurationChange = (): void => {
    const audio = this.audio;
    if (!audio || !Number.isFinite(audio.duration)) return;
    this.patch({ duration: audio.duration });
  };

  private handlePlaying = (): void => {
    this.skipAttempts = 0;
    const audio = this.audio;
    this.patch({
      status: "playing",
      hasStarted: true,
      needsGesture: false,
      error: null,
      duration:
        audio && Number.isFinite(audio.duration)
          ? audio.duration
          : this.state.duration,
      currentTime: audio ? audio.currentTime : this.state.currentTime,
    });
  };

  private handlePause = (): void => {
    if (this.destroyed) return;
    if (this.suspended) {
      this.patch({ status: "paused" });
      return;
    }
    if (this.wantPlaying) {
      // Paused mid-flight (buffering or a track switch) — we still intend to play.
      this.patch({ status: "loading" });
      return;
    }
    this.patch({
      status: "paused",
      currentTime: this.audio ? this.audio.currentTime : this.state.currentTime,
    });
  };

  private handleWaiting = (): void => {
    if (this.wantPlaying) this.patch({ status: "loading" });
  };

  private handleTimeUpdate = (): void => {
    const audio = this.audio;
    if (!audio) return;
    this.patch({
      currentTime: audio.currentTime,
      duration: Number.isFinite(audio.duration)
        ? audio.duration
        : this.state.duration,
    });
    const now = Date.now();
    if (now - this.lastPersistAt > 2000) {
      this.lastPersistAt = now;
      this.persist();
    }
  };

  private handleSeeked = (): void => {
    const audio = this.audio;
    if (!audio) return;
    this.patch({ currentTime: audio.currentTime });
    this.persist();
  };

  private handleEnded = (): void => {
    if (this.destroyed) return;
    this.skipAttempts = 0;

    if (this.state.repeat === "one") {
      const audio = this.audio;
      if (!audio) return;
      try {
        audio.currentTime = 0;
      } catch {
        return;
      }
      this.patch({ currentTime: 0 });
      void this.startPlayback();
      return;
    }

    const total = PLAYLIST.length;
    let index: number;
    if (this.state.shuffle && total > 1) {
      index = this.randomOtherIndex();
    } else {
      const nextIndex = this.state.trackIndex + 1;
      if (nextIndex >= total) {
        if (this.state.repeat === "all") {
          index = 0;
        } else {
          this.wantPlaying = false;
          this.enabled = false;
          this.patch({
            status: "paused",
            currentTime: this.state.duration,
          });
          this.persist();
          return;
        }
      } else {
        index = nextIndex;
      }
    }

    if (index === this.state.trackIndex) {
      this.play();
      return;
    }
    this.select(index);
  };

  private handleError = (): void => {
    if (this.destroyed) return;
    this.handleTrackFailure();
  };
}

interface MusicWindow extends Window {
  __PRCDOR_MUSIC__?: MusicController;
}

/**
 * Document-wide singleton. Storing it on `window` keeps exactly one audio
 * element alive across HMR reloads and route changes.
 */
export function getMusicController(): MusicController {
  if (typeof window === "undefined") return new MusicController();
  const target = window as MusicWindow;
  if (!target.__PRCDOR_MUSIC__) target.__PRCDOR_MUSIC__ = new MusicController();
  return target.__PRCDOR_MUSIC__;
}
