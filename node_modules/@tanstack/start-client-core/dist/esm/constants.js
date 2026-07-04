//#region src/constants.ts
var TSS_FORMDATA_CONTEXT = "__TSS_CONTEXT";
var TSS_SERVER_FUNCTION = Symbol.for("TSS_SERVER_FUNCTION");
var TSS_SERVER_FUNCTION_FACTORY = Symbol.for("TSS_SERVER_FUNCTION_FACTORY");
var X_TSS_SERIALIZED = "x-tss-serialized";
var X_TSS_RAW_RESPONSE = "x-tss-raw";
var X_TSS_CONTEXT = "x-tss-context";
/** Content-Type for multiplexed framed responses (RawStream support) */
var TSS_CONTENT_TYPE_FRAMED = "application/x-tss-framed";
/**
* Frame types for binary multiplexing protocol.
*/
var FrameType = {
	/** Seroval JSON chunk (NDJSON line) */
	JSON: 0,
	/** Raw stream data chunk */
	CHUNK: 1,
	/** Raw stream end (EOF) */
	END: 2,
	/** Raw stream error */
	ERROR: 3
};
/** Header size in bytes: type(1) + streamId(4) + length(4) */
var FRAME_HEADER_SIZE = 9;
/** Current protocol version for framed responses */
var TSS_FRAMED_PROTOCOL_VERSION = 1;
/** Full Content-Type header value with version parameter */
var TSS_CONTENT_TYPE_FRAMED_VERSIONED = `${TSS_CONTENT_TYPE_FRAMED}; v=1`;
/**
* Parses the version parameter from a framed Content-Type header.
* Returns undefined if no version parameter is present.
*/
var FRAMED_VERSION_REGEX = /;\s*v=(\d+)/;
function parseFramedProtocolVersion(contentType) {
	const match = contentType.match(FRAMED_VERSION_REGEX);
	return match ? parseInt(match[1], 10) : void 0;
}
/**
* Validates that the server's protocol version is compatible with this client.
* Throws an error if versions are incompatible.
*/
function validateFramedProtocolVersion(contentType) {
	const serverVersion = parseFramedProtocolVersion(contentType);
	if (serverVersion === void 0) return;
	if (serverVersion !== 1) throw new Error(`Incompatible framed protocol version: server=${serverVersion}, client=1. Please ensure client and server are using compatible versions.`);
}
//#endregion
export { FRAME_HEADER_SIZE, FrameType, TSS_CONTENT_TYPE_FRAMED, TSS_CONTENT_TYPE_FRAMED_VERSIONED, TSS_FORMDATA_CONTEXT, TSS_FRAMED_PROTOCOL_VERSION, TSS_SERVER_FUNCTION, TSS_SERVER_FUNCTION_FACTORY, X_TSS_CONTEXT, X_TSS_RAW_RESPONSE, X_TSS_SERIALIZED, validateFramedProtocolVersion };

//# sourceMappingURL=constants.js.map