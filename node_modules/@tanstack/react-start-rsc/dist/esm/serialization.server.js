import { RENDERABLE_RSC, RSC_SLOT_USAGES_STREAM, SERVER_COMPONENT_CSS_HREFS, SERVER_COMPONENT_JS_PRELOADS, SERVER_COMPONENT_STREAM, isServerComponent } from "./ServerComponentTypes.js";
import { unwrapRscCssEnvelope } from "./rscCssEnvelope.js";
import { awaitLazyElements } from "./awaitLazyElements.js";
import { createRscProxy } from "./createRscProxy.js";
import { getStartContext } from "@tanstack/start-storage-context";
import { createSerializationAdapter } from "@tanstack/react-router";
import { AsyncLocalStorage } from "node:async_hooks";
import { RawStream } from "@tanstack/router-core";
import { createFromReadableStream, setOnClientReference } from "virtual:tanstack-rsc-ssr-decode";
//#region src/serialization.server.ts
var proxyCssCollectorStorage = new AsyncLocalStorage();
var proxyJsCollectorStorage = new AsyncLocalStorage();
setOnClientReference(({ deps, runtime }) => {
	const cssCollector = proxyCssCollectorStorage.getStore();
	if (cssCollector) for (const href of deps.css) cssCollector.add(href);
	const jsCollector = proxyJsCollectorStorage.getStore();
	if (jsCollector) for (const href of deps.js) jsCollector.add(href);
	if (runtime === "rsbuild" || cssCollector || jsCollector) return;
	const ctx = getStartContext({ throwIfNotFound: false });
	if (!ctx || !deps.js.length && !deps.css.length) return;
	if (!ctx.requestAssets) ctx.requestAssets = {};
	const seenHrefs = /* @__PURE__ */ new Set();
	for (const preload of ctx.requestAssets.preloads ?? []) seenHrefs.add(typeof preload === "string" ? preload : preload.href);
	for (const stylesheet of ctx.requestAssets.css ?? []) seenHrefs.add(typeof stylesheet === "string" ? stylesheet : stylesheet.href);
	let nextPreloads;
	for (const href of deps.js) {
		if (seenHrefs.has(href)) continue;
		seenHrefs.add(href);
		if (!nextPreloads) nextPreloads = ctx.requestAssets.preloads ? ctx.requestAssets.preloads.slice() : [];
		nextPreloads.push(href);
	}
	if (nextPreloads) ctx.requestAssets.preloads = nextPreloads;
	let nextCss;
	for (const href of deps.css) {
		if (seenHrefs.has(href)) continue;
		seenHrefs.add(href);
		if (!nextCss) nextCss = ctx.requestAssets.css ? ctx.requestAssets.css.slice() : [];
		nextCss.push(href);
	}
	if (nextCss) ctx.requestAssets.css = nextCss;
});
globalThis.__RSC_SSR__ = {
	async decode(stream) {
		const readableStream = stream.createReplayStream();
		const proxyCssCollector = /* @__PURE__ */ new Set();
		const proxyJsCollector = /* @__PURE__ */ new Set();
		return proxyCssCollectorStorage.run(proxyCssCollector, async () => {
			return proxyJsCollectorStorage.run(proxyJsCollector, async () => {
				const decodedTree = await createFromReadableStream(readableStream);
				await awaitLazyElements(decodedTree, (href) => {
					proxyCssCollector.add(href);
				});
				return {
					tree: unwrapRscCssEnvelope(decodedTree),
					cssHrefs: proxyCssCollector.size > 0 ? proxyCssCollector : void 0,
					jsPreloads: proxyJsCollector.size > 0 ? proxyJsCollector : void 0
				};
			});
		});
	},
	createRenderableProxy(stream, decoded) {
		return createRscProxy(() => decoded.tree, {
			stream,
			cssHrefs: decoded.cssHrefs,
			jsPreloads: decoded.jsPreloads,
			renderable: true
		});
	},
	createCompositeProxy(stream, decoded, slotUsagesStream) {
		return createRscProxy(() => decoded.tree, {
			stream,
			cssHrefs: decoded.cssHrefs,
			jsPreloads: decoded.jsPreloads,
			renderable: false,
			slotUsagesStream
		});
	}
};
/**
* Helper to check if a value is a renderable RSC (from renderServerComponent).
* The value can be either an object (proxy target) or a function (stub for server functions).
*/
function isRenderableRsc(value) {
	if (value === null || value === void 0) return false;
	if (typeof value !== "object" && typeof value !== "function") return false;
	return RENDERABLE_RSC in value && value[RENDERABLE_RSC] === true;
}
/**
* Server-side serialization adapter for RSC (renderable + composite).
*/
var adapter = createSerializationAdapter({
	key: "$RSC",
	test: (value) => {
		return isServerComponent(value);
	},
	toSerializable: (component) => {
		const stream = component[SERVER_COMPONENT_STREAM].createReplayStream();
		const kind = isRenderableRsc(component) ? "renderable" : "composite";
		const jsPreloads = component[SERVER_COMPONENT_JS_PRELOADS];
		const cssHrefs = component[SERVER_COMPONENT_CSS_HREFS];
		const serializedAssetDeps = jsPreloads?.size ? {
			...cssHrefs?.size ? { cssHrefs: Array.from(cssHrefs) } : {},
			jsPreloads: Array.from(jsPreloads)
		} : {};
		const slotUsagesStream = kind === "composite" && process.env.NODE_ENV === "development" && RSC_SLOT_USAGES_STREAM in component ? component[RSC_SLOT_USAGES_STREAM] : void 0;
		return {
			kind,
			stream: new RawStream(stream, { hint: "text" }),
			slotUsagesStream,
			...serializedAssetDeps
		};
	},
	fromSerializable: () => {
		throw new Error("Server should never deserialize RSC data");
	}
});
/**
* Factory function for server-side RSC serialization adapter.
*/
var rscSerializationAdapter = () => [adapter];
//#endregion
export { rscSerializationAdapter };

//# sourceMappingURL=serialization.server.js.map