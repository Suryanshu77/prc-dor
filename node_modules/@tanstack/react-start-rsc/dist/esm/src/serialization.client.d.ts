import { AnyCompositeComponent, RscSlotUsageEvent } from './ServerComponentTypes.js';
/**
 * Client-side serialization adapter for RSC (renderable + composite).
 */
type SerializedRsc = {
    kind: 'renderable' | 'composite';
    stream: ReadableStream<Uint8Array>;
    slotUsagesStream?: ReadableStream<RscSlotUsageEvent>;
    cssHrefs?: Array<string>;
    jsPreloads?: Array<string>;
};
export declare const rscSerializationAdapter: () => import('@tanstack/router-core').SerializationAdapter<AnyCompositeComponent, SerializedRsc, never>[];
export {};
