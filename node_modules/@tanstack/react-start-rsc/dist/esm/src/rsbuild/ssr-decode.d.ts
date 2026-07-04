/**
 * Rsbuild SSR decode implementation.
 *
 * Bundler-owned rsbuild virtual modules re-export this module for SSR-side
 * Flight decode.
 */
type ClientReferenceDeps = {
    js: Array<string>;
    css: Array<string>;
};
type OnClientReference = (reference: {
    id: string;
    deps: ClientReferenceDeps;
    runtime: 'rsbuild';
}) => void;
declare function setOnClientReference(callback: OnClientReference | undefined): void;
declare function createFromReadableStreamWithClientPreloads<T = unknown>(stream: ReadableStream<Uint8Array>, options?: object): Promise<T>;
export { setOnClientReference, createFromReadableStreamWithClientPreloads as createFromReadableStream, };
