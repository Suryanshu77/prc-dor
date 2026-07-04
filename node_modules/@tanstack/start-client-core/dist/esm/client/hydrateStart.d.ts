import { AnyRouter } from '@tanstack/router-core';
type HotContext = {
    data?: Record<string, unknown>;
    dispose?: (cb: (data: Record<string, unknown>) => void) => void;
};
declare global {
    interface ImportMeta {
        hot?: HotContext;
        webpackHot?: HotContext;
    }
}
declare function hydrateStart(): Promise<AnyRouter>;
declare const exportedHydrateStart: typeof hydrateStart;
export { exportedHydrateStart as hydrateStart };
