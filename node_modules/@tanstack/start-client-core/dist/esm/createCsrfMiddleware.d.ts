import { RequestMiddlewareAfterServer, RequestServerOptions } from './createMiddleware.js';
import { Register } from '@tanstack/router-core';
export declare const csrfSymbol: unique symbol;
export type CsrfSecFetchSite = 'same-origin' | 'same-site' | 'cross-site' | 'none';
export type CsrfMatcher<TValue, TRegister = Register, TMiddlewares = unknown> = TValue | Array<TValue> | ((value: TValue | (string & {}), ctx: RequestServerOptions<TRegister, TMiddlewares>) => boolean | Promise<boolean>);
export interface CsrfMiddlewareOptions<TRegister = Register, TMiddlewares = unknown> {
    /**
     * Return `true` to validate this request, or `false` to skip validation.
     *
     * @default undefined, which validates every request handled by this middleware.
     */
    filter?: (ctx: RequestServerOptions<TRegister, TMiddlewares>) => boolean | Promise<boolean>;
    /**
     * Allowed Origin values. Defaults to the trusted request origin.
     */
    origin?: CsrfMatcher<string, TRegister, TMiddlewares>;
    /**
     * Allowed Sec-Fetch-Site values.
     *
     * @default 'same-origin'
     */
    secFetchSite?: CsrfMatcher<CsrfSecFetchSite, TRegister, TMiddlewares>;
    /**
     * Whether to use Referer as a fallback when Sec-Fetch-Site and Origin are absent.
     *
     * @default true
     */
    referer?: boolean | ((referer: string, ctx: RequestServerOptions<TRegister, TMiddlewares>) => boolean | Promise<boolean>);
    /**
     * Allow requests when Sec-Fetch-Site, Origin, and Referer are all missing.
     *
     * @default false
     */
    allowRequestsWithoutOriginCheck?: boolean;
    /**
     * Optional response returned when CSRF validation fails.
     *
     * @default new Response('Forbidden', { status: 403 })
     */
    failureResponse?: Response | ((ctx: RequestServerOptions<TRegister, TMiddlewares>) => Response | Promise<Response>);
}
type CreateCsrfMiddleware = <TRegister, TMiddlewares>(opts?: CsrfMiddlewareOptions<TRegister, TMiddlewares>) => RequestMiddlewareAfterServer<{}, undefined, undefined>;
export declare const createCsrfMiddleware: CreateCsrfMiddleware;
export declare function isCsrfRequestAllowed<TRegister, TMiddlewares>(opts: CsrfMiddlewareOptions<TRegister, TMiddlewares>, ctx: RequestServerOptions<TRegister, TMiddlewares>): Promise<boolean>;
export declare function getCsrfRequestValidationResult<TRegister, TMiddlewares>(opts: CsrfMiddlewareOptions<TRegister, TMiddlewares>, ctx: RequestServerOptions<TRegister, TMiddlewares>): Promise<boolean | undefined>;
export {};
