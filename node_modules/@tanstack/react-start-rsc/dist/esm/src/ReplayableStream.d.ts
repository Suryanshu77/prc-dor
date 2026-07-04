/**
 * ReplayableStream is used for React Server Components (RSC) / Flight streams.
 *
 * In this package the same Flight payload may need to be:
 * - decoded for SSR (render path), and/or
 * - serialized for transport to the client for client-side decoding.
 *
 * Call sites:
 * - `src/createServerComponent.ts`: wraps the produced Flight stream once.
 * - `src/serialization.ts`: uses `createReplayStream()` to transport a fresh stream
 *   to the client via `RawStream`.
 *
 * Constraints:
 * - Consumption order isn't fixed: SSR decode might start first or transport might
 *   start first depending on the request path.
 * - Sometimes only one happens (e.g. when client calls server function directly).
 *
 * Why not just `ReadableStream.tee()`?
 * - tee() must be called up-front before the stream is consumed/locked and only
 *   creates two live branches (no late "replay from byte 0").
 * - If one branch is slower or never consumed, the runtime may buffer internally
 *   to keep branches consistent, which can retain large Flight payloads longer
 *   than intended and makes cleanup less explicit.
 *
 * ReplayableStream reads once, buffers explicitly, can mint replay streams on
 * demand, and centralizes cancellation so aborting can stop upstream work and
 * free buffered data deterministically.
 *
 * Memory Management:
 * - Memory is released when the abort signal fires (request cancelled)
 * - Call `release()` to force immediate cleanup if no more replays are needed
 * - No automatic release: replays can be created at unpredictable times (SSR decode
 *   finishes before serialization starts), so we can't safely auto-release
 */
export interface ReplayableStreamOptions {
    signal?: AbortSignal;
}
export declare const REPLAYABLE_STREAM_MARKER: unique symbol;
export declare class ReplayableStream<T = Uint8Array> {
    private source;
    private options;
    readonly [REPLAYABLE_STREAM_MARKER] = true;
    private chunks;
    private done;
    private error;
    private waiter;
    private aborted;
    private released;
    private sourceReader;
    private abortSignal;
    private abortListener;
    constructor(source: ReadableStream<T>, options?: ReplayableStreamOptions);
    private start;
    private detachAbortListener;
    private cancelSource;
    private handleAbort;
    private notify;
    private wait;
    /**
     * Explicitly release buffered chunks.
     * Call this when you know no more replay streams will be created.
     * After calling release(), createReplayStream() will return empty streams.
     */
    release(): void;
    /**
     * Check if the stream data has been released
     */
    isReleased(): boolean;
    /**
     * Create an independent replay stream. Each call returns a fresh reader
     * that starts from the beginning of the buffered data.
     *
     * If the stream has been released, returns a stream that closes immediately.
     */
    createReplayStream(): ReadableStream<T>;
}
