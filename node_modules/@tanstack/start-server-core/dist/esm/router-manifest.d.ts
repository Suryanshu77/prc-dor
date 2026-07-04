import { AnyRoute, ServerManifest } from '@tanstack/router-core';
/**
 * @description Returns the router manifest data that should be sent to the client.
 * This includes only the assets and preloads for the current route and any
 * special assets that are needed for the client. It does not include relationships
 * between routes or any other data that is not needed for the client.
 *
 * @param matchedRoutes - In dev mode, the matched routes are used to build
 * the dev styles URL for route-scoped CSS collection.
 */
export declare function getStartManifest(matchedRoutes?: ReadonlyArray<AnyRoute>): Promise<ServerManifest>;
