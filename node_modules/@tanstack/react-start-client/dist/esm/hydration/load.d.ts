import { HydrationPrefetchStrategy } from '@tanstack/start-client-core/hydration';
import { HydrateProps, ReactHydrationStrategy } from '../Hydrate.js';
import * as React from 'react';
export declare function LoadHydrate(props: HydrateProps): React.JSX.Element;
export declare function load(): ReactHydrationStrategy<'load', true> & HydrationPrefetchStrategy<'load'>;
