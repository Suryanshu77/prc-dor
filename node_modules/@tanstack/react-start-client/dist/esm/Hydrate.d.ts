import { HydrationStrategy as CoreHydrationStrategy, HydrationPrefetchFunction, HydrationPrefetchStrategy, HydrationWhen } from '@tanstack/start-client-core/hydration';
import * as React from 'react';
export type { HydrationInteractionEvent, HydrationInteractionEvents, HydrationPrefetchContext, HydrationPrefetchFunction, HydrationPrefetchStrategy, HydrationPrefetchWaitReason, HydrationWhen, } from '@tanstack/start-client-core/hydration';
export type ReactHydrationStrategy<TWhen extends HydrationWhen = HydrationWhen, TCanPrefetch extends boolean = boolean> = CoreHydrationStrategy<TWhen, TCanPrefetch> & {
    _h: (this: ReactHydrationStrategy, props: HydrateProps) => React.JSX.Element;
};
export type HydrationStrategy<TWhen extends HydrationWhen = HydrationWhen, TCanPrefetch extends boolean = boolean> = ReactHydrationStrategy<TWhen, TCanPrefetch>;
export type HydrateWhen = ReactHydrationStrategy | (() => ReactHydrationStrategy);
type HydrateCommonOptions = {
    when: HydrateWhen;
    fallback?: React.ReactNode;
    onHydrated?: () => void;
};
export type HydrateOptions = (HydrateCommonOptions & {
    prefetch?: never;
    split?: boolean;
}) | (HydrateCommonOptions & {
    prefetch: HydrationPrefetchStrategy;
    split?: true;
}) | (HydrateCommonOptions & {
    prefetch: HydrationPrefetchFunction;
    split?: boolean;
});
export type HydrateProps = HydrateOptions & {
    children: React.ReactNode;
};
export type InternalHydrateProps = HydrateProps & {
    h?: string;
    p?: () => Promise<void>;
};
export declare function Hydrate(props: HydrateProps): React.JSX.Element;
