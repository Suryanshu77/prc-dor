import { FrameType } from "../constants.js";
//#region src/client-rpc/frame-decoder.ts
/**
* Client-side frame decoder for multiplexed responses.
*
* Decodes binary frame protocol and reconstructs:
* - JSON stream (NDJSON lines for seroval)
* - Raw streams (binary data as ReadableStream<Uint8Array>)
*/
/** Cached TextDecoder for frame decoding */
var textDecoder = new TextDecoder();
/** Shared empty buffer for empty buffer case - avoids allocation */
var EMPTY_BUFFER = new Uint8Array(0);
/** Hardening limits to prevent memory/CPU DoS */
var MAX_FRAME_PAYLOAD_SIZE = 16 * 1024 * 1024;
var MAX_BUFFERED_BYTES = 32 * 1024 * 1024;
var MAX_STREAMS = 1024;
var MAX_FRAMES = 1e5;
/**
* Creates a frame decoder that processes a multiplexed response stream.
*
* @param input The raw response body stream
* @returns Decoded JSON stream and stream getter function
*/
function createFrameDecoder(input) {
	const streamControllers = /* @__PURE__ */ new Map();
	const streams = /* @__PURE__ */ new Map();
	const cancelledStreamIds = /* @__PURE__ */ new Set();
	let cancelled = false;
	let inputReader = null;
	let frameCount = 0;
	let jsonController;
	const jsonChunks = new ReadableStream({
		start(controller) {
			jsonController = controller;
		},
		cancel() {
			cancelled = true;
			try {
				inputReader?.cancel();
			} catch {}
			streamControllers.forEach((ctrl) => {
				try {
					ctrl.error(/* @__PURE__ */ new Error("Framed response cancelled"));
				} catch {}
			});
			streamControllers.clear();
			streams.clear();
			cancelledStreamIds.clear();
		}
	});
	/**
	* Gets or creates a stream for a given stream ID.
	* Called by deserialize plugin when it encounters a RawStream reference.
	*/
	function getOrCreateStream(id) {
		const existing = streams.get(id);
		if (existing) return existing;
		if (cancelledStreamIds.has(id)) return new ReadableStream({ start(controller) {
			controller.close();
		} });
		if (streams.size >= MAX_STREAMS) throw new Error(`Too many raw streams in framed response (max ${MAX_STREAMS})`);
		const stream = new ReadableStream({
			start(ctrl) {
				streamControllers.set(id, ctrl);
			},
			cancel() {
				cancelledStreamIds.add(id);
				streamControllers.delete(id);
				streams.delete(id);
			}
		});
		streams.set(id, stream);
		return stream;
	}
	/**
	* Ensures stream exists and returns its controller for enqueuing data.
	* Used for CHUNK frames where we need to ensure stream is created.
	*/
	function ensureController(id) {
		getOrCreateStream(id);
		return streamControllers.get(id);
	}
	(async () => {
		const reader = input.getReader();
		inputReader = reader;
		const bufferList = [];
		let totalLength = 0;
		/**
		* Reads header bytes from buffer chunks without flattening.
		* Returns header data or null if not enough bytes available.
		*/
		function readHeader() {
			if (totalLength < 9) return null;
			const first = bufferList[0];
			if (first.length >= 9) return {
				type: first[0],
				streamId: (first[1] << 24 | first[2] << 16 | first[3] << 8 | first[4]) >>> 0,
				length: (first[5] << 24 | first[6] << 16 | first[7] << 8 | first[8]) >>> 0
			};
			const headerBytes = new Uint8Array(9);
			let offset = 0;
			let remaining = 9;
			for (let i = 0; i < bufferList.length && remaining > 0; i++) {
				const chunk = bufferList[i];
				const toCopy = Math.min(chunk.length, remaining);
				headerBytes.set(chunk.subarray(0, toCopy), offset);
				offset += toCopy;
				remaining -= toCopy;
			}
			return {
				type: headerBytes[0],
				streamId: (headerBytes[1] << 24 | headerBytes[2] << 16 | headerBytes[3] << 8 | headerBytes[4]) >>> 0,
				length: (headerBytes[5] << 24 | headerBytes[6] << 16 | headerBytes[7] << 8 | headerBytes[8]) >>> 0
			};
		}
		/**
		* Flattens buffer list into single Uint8Array and removes from list.
		*/
		function extractFlattened(count) {
			if (count === 0) return EMPTY_BUFFER;
			const result = new Uint8Array(count);
			let offset = 0;
			let remaining = count;
			while (remaining > 0 && bufferList.length > 0) {
				const chunk = bufferList[0];
				if (!chunk) break;
				const toCopy = Math.min(chunk.length, remaining);
				result.set(chunk.subarray(0, toCopy), offset);
				offset += toCopy;
				remaining -= toCopy;
				if (toCopy === chunk.length) bufferList.shift();
				else bufferList[0] = chunk.subarray(toCopy);
			}
			totalLength -= count;
			return result;
		}
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (cancelled) break;
				if (done) break;
				if (!value) continue;
				if (totalLength + value.length > MAX_BUFFERED_BYTES) throw new Error(`Framed response buffer exceeded ${MAX_BUFFERED_BYTES} bytes`);
				bufferList.push(value);
				totalLength += value.length;
				while (true) {
					const header = readHeader();
					if (!header) break;
					const { type, streamId, length } = header;
					if (type !== FrameType.JSON && type !== FrameType.CHUNK && type !== FrameType.END && type !== FrameType.ERROR) throw new Error(`Unknown frame type: ${type}`);
					if (type === FrameType.JSON) {
						if (streamId !== 0) throw new Error("Invalid JSON frame streamId (expected 0)");
					} else if (streamId === 0) throw new Error("Invalid raw frame streamId (expected non-zero)");
					if (length > MAX_FRAME_PAYLOAD_SIZE) throw new Error(`Frame payload too large: ${length} bytes (max ${MAX_FRAME_PAYLOAD_SIZE})`);
					const frameSize = 9 + length;
					if (totalLength < frameSize) break;
					if (++frameCount > MAX_FRAMES) throw new Error(`Too many frames in framed response (max ${MAX_FRAMES})`);
					extractFlattened(9);
					const payload = extractFlattened(length);
					switch (type) {
						case FrameType.JSON:
							try {
								jsonController.enqueue(textDecoder.decode(payload));
							} catch {}
							break;
						case FrameType.CHUNK: {
							const ctrl = ensureController(streamId);
							if (ctrl) ctrl.enqueue(payload);
							break;
						}
						case FrameType.END: {
							const ctrl = ensureController(streamId);
							cancelledStreamIds.add(streamId);
							if (ctrl) {
								try {
									ctrl.close();
								} catch {}
								streamControllers.delete(streamId);
							}
							break;
						}
						case FrameType.ERROR: {
							const ctrl = ensureController(streamId);
							cancelledStreamIds.add(streamId);
							if (ctrl) {
								const message = textDecoder.decode(payload);
								ctrl.error(new Error(message));
								streamControllers.delete(streamId);
							}
							break;
						}
					}
				}
			}
			if (totalLength !== 0) throw new Error("Incomplete frame at end of framed response");
			try {
				jsonController.close();
			} catch {}
			streamControllers.forEach((ctrl) => {
				try {
					ctrl.close();
				} catch {}
			});
			streamControllers.clear();
		} catch (error) {
			try {
				jsonController.error(error);
			} catch {}
			streamControllers.forEach((ctrl) => {
				try {
					ctrl.error(error);
				} catch {}
			});
			streamControllers.clear();
		} finally {
			try {
				reader.releaseLock();
			} catch {}
			inputReader = null;
		}
	})();
	return {
		getOrCreateStream,
		jsonChunks
	};
}
//#endregion
export { createFrameDecoder };

//# sourceMappingURL=frame-decoder.js.map