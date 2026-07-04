import { HydrationInteractionEvents, HydrationPrefetchStrategy, HydrationRuntimeContext } from './types.js';
export type InteractionHydrationOptions = {
    events?: HydrationInteractionEvents;
};
declare const interactionType = "interaction";
export declare function listenForDelegatedHydrationIntent(element: Element, context: HydrationRuntimeContext): (() => void) | undefined;
export declare function interaction(options?: InteractionHydrationOptions): HydrationPrefetchStrategy<typeof interactionType>;
export {};
