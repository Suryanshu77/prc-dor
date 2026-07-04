import { HydrationPrefetchStrategy } from './types.js';
declare const visibleType = "visible";
export type VisibleHydrationOptions = {
    rootMargin?: string;
    threshold?: number | Array<number>;
};
export declare function visible(options?: VisibleHydrationOptions): HydrationPrefetchStrategy<typeof visibleType>;
export {};
