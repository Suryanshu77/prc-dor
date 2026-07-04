import { HydrationPrefetchStrategy, VisibleHydrationOptions } from '@tanstack/start-client-core/hydration';
import { HydrateProps, ReactHydrationStrategy } from '../Hydrate.js';
import * as React from 'react';
export declare function VisibleHydrate(this: ReactHydrationStrategy, props: HydrateProps): React.JSX.Element;
export declare function visible(options?: VisibleHydrationOptions): ReactHydrationStrategy<'visible', true> & HydrationPrefetchStrategy<'visible'>;
