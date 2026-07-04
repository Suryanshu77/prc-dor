/**
 * Low-level Flight stream APIs for decoding RSC streams.
 *
 * These functions provide direct access to RSC Flight stream decoding,
 * allowing advanced use cases like:
 * - Server functions returning raw Flight Response
 * - API routes streaming Flight payloads
 * - Custom Flight stream handling via RawStream
 *
 * `createFromReadableStream` works in both SSR and browser contexts.
 * `createFromFetch` is browser-only.
 *
 * NOTE: Dynamic imports keep decode initialisation runtime-specific. The
 * concrete implementation comes from bundler-owned virtual modules.
 */
/**
 * Decode a Flight stream into React elements.
 * Works in both SSR and browser contexts.
 *
 * @example
 * ```tsx
 * const rawStream = await getRscRawStream()
 * const tree = await createFromReadableStream(rawStream)
 * return <>{tree}</>
 * ```
 */
export declare const createFromReadableStream: import('@tanstack/start-fn-stubs').IsomorphicFn<[stream: ReadableStream<Uint8Array<ArrayBufferLike>>], Promise<import('react').ReactNode>, Promise<import('react').ReactNode>>;
/**
 * Decode a Flight stream from a fetch Response.
 * Browser only - will throw if called on the server.
 *
 * @example
 * ```tsx
 * // From server function returning raw Response
 * const tree = await createFromFetch(getFlightResponse())
 *
 * // From API route
 * const tree = await createFromFetch(fetch('/api/rsc-flight'))
 * ```
 */
export declare const createFromFetch: (fetchPromise: Promise<Response>) => Promise<React.ReactNode>;
