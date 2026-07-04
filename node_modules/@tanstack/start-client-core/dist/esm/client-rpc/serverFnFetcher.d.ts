/**
 * Set the current post-processing context for async deserialization work.
 * Called before deserialization starts.
 *
 * @param ctx - Array to collect async work promises, or null to clear
 */
export declare function setPostProcessContext(ctx: Array<Promise<unknown>> | null): void;
/**
 * Get the current post-processing context.
 * Returns null if no deserialization is in progress.
 */
export declare function getPostProcessContext(): Array<Promise<unknown>> | null;
/**
 * Track an async post-processing promise in the current deserialization context.
 * Called by deserializers that need to perform async work after sync deserialization.
 *
 * If no context is active (e.g., on server), this is a no-op.
 *
 * @param promise - The async work promise to track
 */
export declare function trackPostProcessPromise(promise: Promise<unknown>): void;
export declare function serverFnFetcher(url: string, args: Array<any>, handler: (url: string, requestInit: RequestInit) => Promise<Response>): Promise<any>;
