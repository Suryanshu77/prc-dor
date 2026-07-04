import { AssetCrossOrigin, Awaitable, ServerManifest } from '@tanstack/router-core';
export type { AssetCrossOrigin };
export type TransformAssetsContext = {
    url: string;
    kind: 'script';
} | {
    url: string;
    kind: 'stylesheet';
} | {
    url: string;
    kind: 'css-url';
    stylesheetHref: string;
};
export type TransformAssetKind = TransformAssetsContext['kind'];
type TransformAssetsShorthandCrossOriginKind = Exclude<TransformAssetKind, 'css-url'>;
export type TransformAssetResult = string | {
    href: string;
    crossOrigin?: AssetCrossOrigin;
};
export type TransformAssetsFn = (context: TransformAssetsContext) => Awaitable<TransformAssetResult>;
export type CreateTransformAssetsContext = {
    /** True when the server is computing the cached manifest during startup warmup. */
    warmup: true;
} | {
    /**
     * The current Request.
     *
     * Only available during request handling (i.e. when `warmup: false`).
     */
    request: Request;
    /** False when transforming URLs as part of request handling. */
    warmup: false;
};
export type CreateTransformAssetsFn = (ctx: CreateTransformAssetsContext) => Awaitable<TransformAssetsFn>;
type TransformAssetsOptionsBase = {
    /**
     * Whether to cache the transformed manifest after the first request.
     *
     * When `true` (default), the transform runs once on the first request and
     * the resulting manifest is reused for all subsequent requests in production.
     *
     * Set to `false` for per-request transforms (e.g. geo-routing to different
     * CDNs based on request headers).
     *
     * @default true
     */
    cache?: boolean;
    /**
     * When `true`, warms up the cached transformed manifest in the background when
     * the server starts (production only).
     *
     * This can reduce latency for the first request when `cache` is `true`.
     * Has no effect when `cache: false` (per-request transforms) or in dev mode.
     *
     * @default false
     */
    warmup?: boolean;
};
export type TransformAssetsOptions = (TransformAssetsOptionsBase & {
    transform: string | TransformAssetsFn;
    createTransform?: never;
}) | (TransformAssetsOptionsBase & {
    createTransform: CreateTransformAssetsFn;
    transform?: never;
});
/**
 * Per-kind crossOrigin configuration for the object shorthand.
 *
 * Accepts either a single value applied to all asset kinds, or a per-kind
 * record (matching `HeadContent`'s `assetCrossOrigin` shape):
 *
 * ```ts
 * // All assets get the same value
 * crossOrigin: 'anonymous'
 *
 * // Different values per kind
 * crossOrigin: { script: 'anonymous', stylesheet: 'use-credentials' }
 * ```
 */
export type TransformAssetsCrossOriginConfig = AssetCrossOrigin | Partial<Record<TransformAssetsShorthandCrossOriginKind, AssetCrossOrigin>>;
/**
 * Object shorthand for `transformAssets`. Combines a URL prefix with optional
 * per-asset `crossOrigin` without needing a callback:
 *
 * ```ts
 * transformAssets: {
 *   prefix: 'https://cdn.example.com',
 *   crossOrigin: 'anonymous',
 * }
 * ```
 */
export interface TransformAssetsObjectShorthand {
    /** URL prefix prepended to every asset URL. */
    prefix: string;
    /**
     * Optional crossOrigin attribute applied to transformed script and stylesheet assets.
     *
     * Accepts a single value or a per-kind record.
     */
    crossOrigin?: TransformAssetsCrossOriginConfig;
}
export type TransformAssets = string | TransformAssetsFn | TransformAssetsObjectShorthand | TransformAssetsOptions;
export type ResolvedTransformAssetsConfig = {
    type: 'transform';
    transformFn: TransformAssetsFn;
    cache: boolean;
} | {
    type: 'createTransform';
    createTransform: CreateTransformAssetsFn;
    cache: boolean;
};
export declare function resolveTransformAssetsConfig(transform: TransformAssets): ResolvedTransformAssetsConfig;
export declare function transformManifestAssets(source: ServerManifest, transformFn: TransformAssetsFn, _opts?: {
    clone?: boolean;
    inlineCss?: boolean;
}): Promise<ServerManifest>;
/**
 * Builds a final ServerManifest without URL transforms. Used when no
 * transformAssets option is provided.
 *
 * Returns a new manifest object so the cached base manifest is never mutated.
 */
export declare function buildManifest(source: ServerManifest, opts?: {
    inlineCss?: boolean;
}): ServerManifest;
