"use client";
import { unwrapRscCssEnvelope } from "./rscCssEnvelope.js";
import { awaitLazyElements } from "./awaitLazyElements.js";
import { createRscProxy } from "./createRscProxy.js";
import { use } from "react";
import { trackPostProcessPromise } from "@tanstack/start-client-core";
import { createFromReadableStream } from "virtual:tanstack-rsc-browser-decode";
//#region src/createServerComponentFromStream.ts
/**
* Creates a renderable RSC proxy from a raw Flight stream.
* Client-side only - used by the client serialization adapter for `renderServerComponent`.
*
* Returns a Proxy that:
* - Can be rendered directly as `{data}` in JSX
* - Supports nested access: `{data.foo.bar}`
* - Masquerades as a React element
*/
function createRenderableFromStream(stream, options) {
	const { getTree, streamWrapper, cssHrefs, jsPreloads } = setupStreamDecode(stream, options);
	return createRscProxy(getTree, {
		stream: streamWrapper,
		cssHrefs,
		jsPreloads,
		renderable: true
	});
}
/**
* Creates a composite RSC proxy from a raw Flight stream.
* Client-side only - used by the client serialization adapter for `createCompositeComponent`.
*
* Returns a Proxy that:
* - NOT directly renderable
* - Supports nested access: `src.foo.bar`
* - Must be rendered via `<CompositeComponent src={...} />`
*/
function createCompositeFromStream(stream, options) {
	const { getTree, streamWrapper, cssHrefs, jsPreloads } = setupStreamDecode(stream, options);
	return createRscProxy(getTree, {
		stream: streamWrapper,
		cssHrefs,
		jsPreloads,
		renderable: false,
		slotUsagesStream: options?.slotUsagesStream
	});
}
/**
* Shared stream decode setup for both renderable and composite.
*/
function setupStreamDecode(stream, options) {
	const cssHrefs = new Set(options?.cssHrefs ?? []);
	const jsPreloads = options?.jsPreloads ? new Set(options.jsPreloads) : void 0;
	const shouldDeferDecode = cssHrefs.size > 0 || !!jsPreloads?.size;
	let cachedTree = void 0;
	let cacheReady = false;
	let transformedTreePromise;
	const startDecode = () => {
		if (!transformedTreePromise) {
			transformedTreePromise = Promise.resolve(createFromReadableStream(stream)).then(async (result) => {
				await awaitLazyElements(result, (href) => {
					cssHrefs.add(href);
				});
				cachedTree = unwrapRscCssEnvelope(result);
				cacheReady = true;
				return cachedTree;
			});
			trackPostProcessPromise(transformedTreePromise);
		}
		return transformedTreePromise;
	};
	if (!shouldDeferDecode) startDecode();
	const streamWrapper = { createReplayStream: () => stream };
	const getTree = () => {
		if (cacheReady) return cachedTree;
		return use(startDecode());
	};
	return {
		getTree,
		streamWrapper,
		cssHrefs,
		jsPreloads
	};
}
//#endregion
export { createCompositeFromStream, createRenderableFromStream };

//# sourceMappingURL=createServerComponentFromStream.js.map