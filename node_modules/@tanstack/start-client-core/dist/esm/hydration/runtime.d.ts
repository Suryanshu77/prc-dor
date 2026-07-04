import { HydrationPrefetchStrategy, HydrationPrefetchWaitReason, HydrationRuntimeGate, HydrationWhen } from './types.js';
export type HydrationGateRecord = HydrationRuntimeGate & {
    id: string;
    when: HydrationWhen;
    promise: Promise<void>;
    consumers: number;
    resolveListeners: Set<() => void>;
};
export declare function createResolvedGate(id: string, when: HydrationWhen): HydrationGateRecord;
export declare function getOrCreateGate(id: string, when: HydrationWhen): HydrationGateRecord;
export declare function releaseGate(gate: HydrationGateRecord): void;
export declare function onGateResolve(gate: HydrationGateRecord, listener: () => void): () => void;
export declare function runHydrationStrategyCleanup(cleanup: void | (() => void)): (() => void) | undefined;
export declare function waitForHydrationPrefetchStrategy(strategy: HydrationPrefetchStrategy, options: {
    element: Element | null;
    signal: AbortSignal;
    onHydrate: (listener: () => void) => () => void;
}): Promise<HydrationPrefetchWaitReason>;
export declare function getMarkerGate(marker: Element): HydrationGateRecord | undefined;
export declare function resolveHydrationMarker(marker: Element): void;
export declare function clearResolvedGateIdsInMarker(marker: Element): void;
export declare function saveFallbackHtml(id: string, element: Element): void;
export declare function getFallbackHtml(id: string): string | undefined;
