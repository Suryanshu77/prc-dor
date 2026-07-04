import { RscSlotUsageEvent } from './ServerComponentTypes.js';
export interface RscProxyOptions {
    stream?: unknown;
    cssHrefs?: ReadonlySet<string>;
    jsPreloads?: ReadonlySet<string>;
    renderable?: boolean;
    slotUsagesStream?: ReadableStream<RscSlotUsageEvent>;
}
/**
 * Creates a recursive Proxy for RSC data.
 *
 * If `renderable: true`, returns a React element that can be rendered as `{data}`.
 * The element also has proxy-like behavior for nested access like `data.foo.bar`.
 *
 * If `renderable: false` (default), the proxy is NOT directly renderable and
 * must be used with `<CompositeComponent src={...} />`.
 */
export declare function createRscProxy<T>(getTree: () => T, options?: RscProxyOptions): any;
