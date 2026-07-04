import { ServerManifest } from '@tanstack/router-core';
import { HandlerInlineCssOption } from './inlineCss.js';
import { TransformAssets } from './transformAssetUrls.js';
export type { HandlerInlineCssOption, TransformAssets };
export interface FinalManifestOptions {
    /**
     * Controls whether Start inlines build-collected CSS by default at runtime.
     *
     * This only has an effect when the build was created with
     * `server.build.inlineCss` enabled. Pass a callback to decide per request.
     * `handler(request, { inlineCss })` overrides this value for that request.
     *
     * @default true
     */
    inlineCss?: HandlerInlineCssOption;
    /**
     * Transform manifest-managed asset URLs and attributes at runtime, e.g. to
     * prepend a CDN prefix.
     *
     * This covers JS preloads, manifest script tags, CSS links, and URLs inside
     * build-collected inline CSS. Asset imports used directly in
     * components should be handled by the bundler instead.
     */
    transformAssets?: TransformAssets;
}
export type GetBaseManifest = () => Promise<ServerManifest>;
export interface FinalManifestRequestOptions {
    request: Request;
    requestInlineCss: boolean | undefined;
    getBaseManifest: GetBaseManifest;
}
export interface FinalManifestResolver {
    warmup: (opts: {
        getBaseManifest: GetBaseManifest;
    }) => Promise<ServerManifest> | undefined;
    resolveCached: (opts: FinalManifestRequestOptions) => Promise<ServerManifest>;
    resolveUncached: (opts: FinalManifestRequestOptions) => Promise<ServerManifest>;
}
export declare function createCachedBaseManifestLoader(loadBaseManifest: GetBaseManifest): GetBaseManifest;
export declare function createFinalManifestResolver(opts: FinalManifestOptions & {
    cacheCreateTransform: boolean;
}): FinalManifestResolver;
