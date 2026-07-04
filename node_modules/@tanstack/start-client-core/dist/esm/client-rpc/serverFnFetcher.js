import { TSS_CONTENT_TYPE_FRAMED, TSS_FORMDATA_CONTEXT, validateFramedProtocolVersion } from "../constants.js";
import { getDefaultSerovalPlugins } from "../getDefaultSerovalPlugins.js";
import { createFrameDecoder } from "./frame-decoder.js";
import { createRawStreamDeserializePlugin, encode, invariant, isNotFound, parseRedirect } from "@tanstack/router-core";
import { fromCrossJSON, toJSONAsync } from "seroval";
//#region src/client-rpc/serverFnFetcher.ts
var serovalPlugins = null;
/**
* Current async post-processing context for deserialization.
*
* Some deserializers need to perform async work after synchronous deserialization
* (e.g., decoding RSC payloads, fetching remote data). This context allows them
* to register promises that must complete before the deserialized value is used.
*
* This uses a synchronous execution context pattern:
* - Each call to `fromCrossJSON` is synchronous
* - Within that synchronous execution, all `fromSerializable` calls happen
* - We set the context before `fromCrossJSON`, clear it after
* - For streaming chunks, we set/clear context around each `onMessage` call
*
* Even with concurrent server function calls, each individual deserialization
* is atomic (synchronous), so promises are correctly scoped to their call.
*/
var currentPostProcessContext = null;
/**
* Set the current post-processing context for async deserialization work.
* Called before deserialization starts.
*
* @param ctx - Array to collect async work promises, or null to clear
*/
function setPostProcessContext(ctx) {
	currentPostProcessContext = ctx;
}
/**
* Track an async post-processing promise in the current deserialization context.
* Called by deserializers that need to perform async work after sync deserialization.
*
* If no context is active (e.g., on server), this is a no-op.
*
* @param promise - The async work promise to track
*/
function trackPostProcessPromise(promise) {
	if (currentPostProcessContext) currentPostProcessContext.push(promise);
}
/**
* Helper to await all post-processing promises.
* Uses Promise.allSettled to ensure all promises complete even if some reject.
*/
async function awaitPostProcessPromises(promises) {
	if (promises.length > 0) await Promise.allSettled(promises);
}
/**
* Checks if an object has at least one own enumerable property.
* More efficient than Object.keys(obj).length > 0 as it short-circuits on first property.
*/
var hop = Object.prototype.hasOwnProperty;
function hasOwnProperties(obj) {
	for (const _ in obj) if (hop.call(obj, _)) return true;
	return false;
}
async function serverFnFetcher(url, args, handler) {
	if (!serovalPlugins) serovalPlugins = getDefaultSerovalPlugins();
	const first = args[0];
	const fetchImpl = first.fetch ?? handler;
	const type = first.data instanceof FormData ? "formData" : "payload";
	const headers = first.headers ? new Headers(first.headers) : new Headers();
	headers.set("x-tsr-serverFn", "true");
	if (type === "payload") headers.set("accept", `${TSS_CONTENT_TYPE_FRAMED}, application/x-ndjson, application/json`);
	if (first.method === "GET") {
		if (type === "formData") throw new Error("FormData is not supported with GET requests");
		const serializedPayload = await serializePayload(first);
		if (serializedPayload !== void 0) {
			const encodedPayload = encode({ payload: serializedPayload });
			if (url.includes("?")) url += `&${encodedPayload}`;
			else url += `?${encodedPayload}`;
		}
	}
	let body = void 0;
	if (first.method === "POST") {
		const fetchBody = await getFetchBody(first);
		if (fetchBody?.contentType) headers.set("content-type", fetchBody.contentType);
		body = fetchBody?.body;
	}
	return await getResponse(async () => fetchImpl(url, {
		method: first.method,
		headers,
		signal: first.signal,
		body
	}));
}
async function serializePayload(opts) {
	let payloadAvailable = false;
	const payloadToSerialize = {};
	if (opts.data !== void 0) {
		payloadAvailable = true;
		payloadToSerialize["data"] = opts.data;
	}
	if (opts.context && hasOwnProperties(opts.context)) {
		payloadAvailable = true;
		payloadToSerialize["context"] = opts.context;
	}
	if (payloadAvailable) return serialize(payloadToSerialize);
}
async function serialize(data) {
	return JSON.stringify(await Promise.resolve(toJSONAsync(data, { plugins: serovalPlugins })));
}
async function getFetchBody(opts) {
	if (opts.data instanceof FormData) {
		let serializedContext = void 0;
		if (opts.context && hasOwnProperties(opts.context)) serializedContext = await serialize(opts.context);
		if (serializedContext !== void 0) opts.data.set(TSS_FORMDATA_CONTEXT, serializedContext);
		return { body: opts.data };
	}
	const serializedBody = await serializePayload(opts);
	if (serializedBody) return {
		body: serializedBody,
		contentType: "application/json"
	};
}
/**
* Retrieves a response from a given function and manages potential errors
* and special response types including redirects and not found errors.
*
* @param fn - The function to execute for obtaining the response.
* @returns The processed response from the function.
* @throws If the response is invalid or an error occurs during processing.
*/
async function getResponse(fn) {
	let response;
	try {
		response = await fn();
	} catch (error) {
		if (error instanceof Response) response = error;
		else {
			console.log(error);
			throw error;
		}
	}
	if (response.headers.get("x-tss-raw") === "true") return response;
	const contentType = response.headers.get("content-type");
	if (!contentType) {
		if (process.env.NODE_ENV !== "production") throw new Error("Invariant failed: expected content-type header to be set");
		invariant();
	}
	if (!!response.headers.get("x-tss-serialized")) {
		let result;
		if (contentType.includes("application/x-tss-framed")) {
			validateFramedProtocolVersion(contentType);
			if (!response.body) throw new Error("No response body for framed response");
			const { getOrCreateStream, jsonChunks } = createFrameDecoder(response.body);
			const plugins = [createRawStreamDeserializePlugin(getOrCreateStream), ...serovalPlugins || []];
			const refs = /* @__PURE__ */ new Map();
			result = await processFramedResponse({
				jsonStream: jsonChunks,
				onMessage: (msg) => fromCrossJSON(msg, {
					refs,
					plugins
				}),
				onError(msg, error) {
					console.error(msg, error);
				}
			});
		} else if (contentType.includes("application/json")) {
			const jsonPayload = await response.json();
			const postProcessPromises = [];
			setPostProcessContext(postProcessPromises);
			try {
				result = fromCrossJSON(jsonPayload, { plugins: serovalPlugins });
			} finally {
				setPostProcessContext(null);
			}
			await awaitPostProcessPromises(postProcessPromises);
		}
		if (!result) {
			if (process.env.NODE_ENV !== "production") throw new Error("Invariant failed: expected result to be resolved");
			invariant();
		}
		if (result instanceof Error) throw result;
		return result;
	}
	if (contentType.includes("application/json")) {
		const jsonPayload = await response.json();
		const redirect = parseRedirect(jsonPayload);
		if (redirect) throw redirect;
		if (isNotFound(jsonPayload)) throw jsonPayload;
		return jsonPayload;
	}
	if (!response.ok) throw new Error(await response.text());
	return response;
}
/**
* Processes a framed response where each JSON chunk is a complete JSON string
* (already decoded by frame decoder).
*
* Uses per-chunk post-processing context to ensure async deserialization work
* completes before the next chunk is processed. This prevents issues when
* streaming values require async post-processing (e.g., RSC decoding).
*/
async function processFramedResponse({ jsonStream, onMessage, onError }) {
	const reader = jsonStream.getReader();
	const { value: firstValue, done: firstDone } = await reader.read();
	if (firstDone || !firstValue) throw new Error("Stream ended before first object");
	const firstObject = JSON.parse(firstValue);
	let drainCancelled = false;
	const drain = (async () => {
		try {
			while (true) {
				const { value, done } = await reader.read();
				if (done) break;
				if (value) try {
					const chunkPostProcessPromises = [];
					setPostProcessContext(chunkPostProcessPromises);
					try {
						onMessage(JSON.parse(value));
					} finally {
						setPostProcessContext(null);
					}
					await awaitPostProcessPromises(chunkPostProcessPromises);
				} catch (e) {
					onError?.(`Invalid JSON: ${value}`, e);
				}
			}
		} catch (err) {
			if (!drainCancelled) onError?.("Stream processing error:", err);
		}
	})();
	let result;
	const initialPostProcessPromises = [];
	setPostProcessContext(initialPostProcessPromises);
	try {
		result = onMessage(firstObject);
	} catch (err) {
		setPostProcessContext(null);
		drainCancelled = true;
		reader.cancel().catch(() => {});
		throw err;
	}
	setPostProcessContext(null);
	await awaitPostProcessPromises(initialPostProcessPromises);
	Promise.resolve(result).catch(() => {
		drainCancelled = true;
		reader.cancel().catch(() => {});
	});
	drain.finally(() => {
		try {
			reader.releaseLock();
		} catch {}
	});
	return result;
}
//#endregion
export { serverFnFetcher, trackPostProcessPromise };

//# sourceMappingURL=serverFnFetcher.js.map