import { HydrationStrategy } from './types.js';
export type HydrationStrategyWithRenderer<TStrategy extends HydrationStrategy, TRenderer> = TStrategy & {
    _h: TRenderer;
};
export declare function withHydrationRenderer<TStrategy extends HydrationStrategy, TRenderer>(strategy: TStrategy, renderer: TRenderer): HydrationStrategyWithRenderer<TStrategy, TRenderer>;
