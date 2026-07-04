import { HydrateProps, ReactHydrationStrategy } from '../Hydrate.js';
import * as React from 'react';
export declare function NeverHydrate(props: HydrateProps): React.JSX.Element;
export declare function never(): ReactHydrationStrategy<'never', false>;
