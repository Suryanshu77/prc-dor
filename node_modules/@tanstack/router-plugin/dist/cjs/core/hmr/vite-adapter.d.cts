import type * as t from '@babel/types';
/**
 * Emits HMR accept code for Vite / native ESM HMR: `import.meta.hot.accept`
 * with a callback that receives the freshly re-imported module.
 *
 * `targetFramework` is currently unused — Vite's framework-specific fast-refresh
 * plugins handle component body patching via their own accept boundaries — but
 * we take it for API symmetry with `createWebpackHmrStatement`.
 */
export declare function createViteHmrStatement(stableRouteOptionKeys: Array<string>, opts?: {
    routeId?: string;
}): Array<t.Statement>;
