import { Awaitable, ManifestRouteAssets, RegisteredRouter } from '@tanstack/router-core';
export type StartHandlerType = 'router' | 'serverFn';
export interface StartStorageContext {
    getRouter: () => Awaitable<RegisteredRouter>;
    request: Request;
    startOptions: any;
    contextAfterGlobalMiddlewares: any;
    executedRequestMiddlewares: Set<any>;
    handlerType: StartHandlerType;
    /**
     * Additional assets to inject for this request.
     * Plugins can add manifest route assets here during request processing.
     * Merged into manifest at dehydration time without mutating cached manifest.
     */
    requestAssets?: ManifestRouteAssets;
}
export declare function runWithStartContext<T>(context: StartStorageContext, fn: () => T | Promise<T>): Promise<T>;
export declare function getStartContext<TThrow extends boolean = true>(opts?: {
    throwIfNotFound?: TThrow;
}): TThrow extends false ? StartStorageContext | undefined : StartStorageContext;
