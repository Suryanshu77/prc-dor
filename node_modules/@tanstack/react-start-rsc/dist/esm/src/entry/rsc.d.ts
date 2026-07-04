import { default as React } from 'react';
export { getServerFnById } from '#tanstack-start-server-fn-resolver';
/**
 * Renders a React node to an RSC Flight stream.
 * Used internally for streaming server component output.
 */
export declare function render(node: React.ReactNode): ReadableStream<Uint8Array>;
