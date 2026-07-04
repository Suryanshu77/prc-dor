import { HydrationPrefetchStrategy, IdleHydrationOptions } from '@tanstack/start-client-core/hydration';
import { ReactHydrationStrategy } from '../Hydrate.js';
export declare function idle(options?: IdleHydrationOptions): ReactHydrationStrategy<'idle', true> & HydrationPrefetchStrategy<'idle'>;
