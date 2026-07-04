import { HydrationCondition, HydrationInteractionEvents, HydrationPrefetchStrategy } from '@tanstack/start-client-core/hydration';
import { ReactHydrationStrategy } from '../Hydrate.js';
export declare function media(query: string): ReactHydrationStrategy<'media', true> & HydrationPrefetchStrategy<'media'>;
export declare function condition(condition: HydrationCondition): ReactHydrationStrategy<'condition', false>;
export declare function interaction(options?: {
    events?: HydrationInteractionEvents;
}): ReactHydrationStrategy<'interaction', true> & HydrationPrefetchStrategy<'interaction'>;
