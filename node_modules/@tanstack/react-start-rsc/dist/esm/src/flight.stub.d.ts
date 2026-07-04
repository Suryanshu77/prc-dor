/**
 * Client stub for renderToReadableStream.
 *
 * This function should never be called at runtime on the client.
 * It exists only to provide types for bundler imports in client bundles.
 * The real implementation only runs inside RSC context (server functions).
 */
export declare function renderToReadableStream(_node: React.ReactNode): ReadableStream<Uint8Array>;
