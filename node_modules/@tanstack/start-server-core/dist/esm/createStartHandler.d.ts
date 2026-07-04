import { RequestHandler } from './request-handler.js';
import { AnyRouter, Register } from '@tanstack/router-core';
import { HandlerCallback } from '@tanstack/router-core/ssr/server';
import { FinalManifestOptions } from './finalManifest.js';
export interface CreateStartHandlerOptions extends FinalManifestOptions {
    handler: HandlerCallback<AnyRouter>;
}
/**
 * Creates the TanStack Start request handler.
 *
 * @example Backwards-compatible usage (handler callback only):
 * ```ts
 * export default createStartHandler(defaultStreamHandler)
 * ```
 *
 * @example With CDN URL rewriting:
 * ```ts
 * export default createStartHandler({
 *   handler: defaultStreamHandler,
 *   transformAssets: 'https://cdn.example.com',
 * })
 * ```
 *
 * @example With per-request URL rewriting:
 * ```ts
 * export default createStartHandler({
 *   handler: defaultStreamHandler,
 *   transformAssets: {
 *     transform: ({ url }) => {
 *       const cdnBase = getRequest().headers.get('x-cdn-base') || ''
 *       return { href: `${cdnBase}${url}` }
 *     },
 *     cache: false,
 *   },
 * })
 * ```
 */
export declare function createStartHandler<TRegister = Register>(cbOrOptions: HandlerCallback<AnyRouter> | CreateStartHandlerOptions): RequestHandler<TRegister>;
