import { RawStream } from '@tanstack/router-core';
import { AnyCompositeComponent } from './ServerComponentTypes.js';
/**
 * Factory function for server-side RSC serialization adapter.
 */
export declare const rscSerializationAdapter: () => import('@tanstack/router-core').SerializationAdapter<AnyCompositeComponent, {
    kind: string;
    stream: RawStream;
    slotUsagesStream: ReadableStream<any> | undefined;
}, never>[];
