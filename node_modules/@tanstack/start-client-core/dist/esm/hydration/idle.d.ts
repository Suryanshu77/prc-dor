import { HydrationPrefetchStrategy } from './types.js';
declare const idleType = "idle";
export type IdleHydrationOptions = {
    timeout?: number;
};
export declare function idle(options?: IdleHydrationOptions): HydrationPrefetchStrategy<typeof idleType>;
export {};
