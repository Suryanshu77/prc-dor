import { AnyCompositeComponent, RscSlotUsageEvent } from './ServerComponentTypes.js';
type StreamDecodeOptions = {
    cssHrefs?: Iterable<string>;
    jsPreloads?: Iterable<string>;
};
/**
 * Creates a renderable RSC proxy from a raw Flight stream.
 * Client-side only - used by the client serialization adapter for `renderServerComponent`.
 *
 * Returns a Proxy that:
 * - Can be rendered directly as `{data}` in JSX
 * - Supports nested access: `{data.foo.bar}`
 * - Masquerades as a React element
 */
export declare function createRenderableFromStream(stream: ReadableStream<Uint8Array>, options?: StreamDecodeOptions): any;
/**
 * Creates a composite RSC proxy from a raw Flight stream.
 * Client-side only - used by the client serialization adapter for `createCompositeComponent`.
 *
 * Returns a Proxy that:
 * - NOT directly renderable
 * - Supports nested access: `src.foo.bar`
 * - Must be rendered via `<CompositeComponent src={...} />`
 */
export declare function createCompositeFromStream(stream: ReadableStream<Uint8Array>, options?: {
    slotUsagesStream?: ReadableStream<RscSlotUsageEvent>;
} & StreamDecodeOptions): AnyCompositeComponent;
export declare const createServerComponentFromStream: typeof createCompositeFromStream;
export {};
