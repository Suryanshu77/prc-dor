export declare const TSS_FORMDATA_CONTEXT = "__TSS_CONTEXT";
export declare const TSS_SERVER_FUNCTION: unique symbol;
export declare const TSS_SERVER_FUNCTION_FACTORY: unique symbol;
export declare const X_TSS_SERIALIZED = "x-tss-serialized";
export declare const X_TSS_RAW_RESPONSE = "x-tss-raw";
export declare const X_TSS_CONTEXT = "x-tss-context";
/** Content-Type for multiplexed framed responses (RawStream support) */
export declare const TSS_CONTENT_TYPE_FRAMED = "application/x-tss-framed";
/**
 * Frame types for binary multiplexing protocol.
 */
export declare const FrameType: {
    /** Seroval JSON chunk (NDJSON line) */
    readonly JSON: 0;
    /** Raw stream data chunk */
    readonly CHUNK: 1;
    /** Raw stream end (EOF) */
    readonly END: 2;
    /** Raw stream error */
    readonly ERROR: 3;
};
export type FrameType = (typeof FrameType)[keyof typeof FrameType];
/** Header size in bytes: type(1) + streamId(4) + length(4) */
export declare const FRAME_HEADER_SIZE = 9;
/** Current protocol version for framed responses */
export declare const TSS_FRAMED_PROTOCOL_VERSION = 1;
/** Full Content-Type header value with version parameter */
export declare const TSS_CONTENT_TYPE_FRAMED_VERSIONED = "application/x-tss-framed; v=1";
export declare function parseFramedProtocolVersion(contentType: string): number | undefined;
/**
 * Validates that the server's protocol version is compatible with this client.
 * Throws an error if versions are incompatible.
 */
export declare function validateFramedProtocolVersion(contentType: string): void;
/**
 * Minimal metadata about a server function, available to client middleware.
 * Only contains the function ID since name/filename may expose server internals.
 */
export interface ClientFnMeta {
    /** The unique identifier for this server function */
    id: string;
}
/**
 * Full metadata about a server function, available to server middleware and server functions.
 * This information is embedded at compile time by the TanStack Start compiler.
 */
export interface ServerFnMeta extends ClientFnMeta {
    /** The original variable name of the server function (e.g., "myServerFn") */
    name: string;
    /** The source file path relative to the project root (e.g., "src/routes/api.ts") */
    filename: string;
}
export {};
