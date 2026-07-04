"use client";
import { RENDERABLE_RSC, RSC_PROXY_GET_TREE, RSC_PROXY_PATH, RSC_SLOT_USAGES, RSC_SLOT_USAGES_STREAM, SERVER_COMPONENT_CSS_HREFS, SERVER_COMPONENT_JS_PRELOADS, SERVER_COMPONENT_STREAM } from "./ServerComponentTypes.js";
import { RscNodeRenderer } from "./RscNodeRenderer.js";
import { createElement } from "react";
//#region src/createRscProxy.tsx
/**
* Creates a recursive Proxy for RSC data.
*
* If `renderable: true`, returns a React element that can be rendered as `{data}`.
* The element also has proxy-like behavior for nested access like `data.foo.bar`.
*
* If `renderable: false` (default), the proxy is NOT directly renderable and
* must be used with `<CompositeComponent src={...} />`.
*/
function createRscProxy(getTree, options = {}) {
	if (options.renderable) return createRenderableElement(getTree, [], options.stream, options.cssHrefs, options.jsPreloads);
	let slotUsages = void 0;
	if (process.env.NODE_ENV === "development" && typeof window !== "undefined" && options.slotUsagesStream) {
		slotUsages = [];
		consumeSlotUsages(options.slotUsagesStream, slotUsages);
	}
	return createRscProxyWithPath(getTree, [], options.stream, options.cssHrefs, options.jsPreloads, slotUsages, options.slotUsagesStream);
}
var UNHANDLED = Symbol("tanstack.rsc.proxy.unhandled");
function handleProxyTrap(kind, prop, options) {
	switch (prop) {
		case "__SEROVAL_STREAM__":
		case "__SEROVAL_SEQUENCE__": return kind === "get" ? void 0 : false;
		case Symbol.iterator:
		case Symbol.asyncIterator: return kind === "get" ? void 0 : false;
		case SERVER_COMPONENT_STREAM: return kind === "get" ? options.stream : options.stream !== void 0;
		case SERVER_COMPONENT_CSS_HREFS: return kind === "get" ? options.cssHrefs : options.cssHrefs !== void 0;
		case SERVER_COMPONENT_JS_PRELOADS: return kind === "get" ? options.jsPreloads : options.jsPreloads !== void 0;
		case RSC_PROXY_GET_TREE: return kind === "get" ? options.getTree : true;
		case RSC_PROXY_PATH: return kind === "get" ? options.path : true;
		case RENDERABLE_RSC: return kind === "get" ? options.renderable : true;
		case RSC_SLOT_USAGES: return kind === "get" ? options.slotUsages : options.slotUsages !== void 0;
		case RSC_SLOT_USAGES_STREAM: return kind === "get" ? options.slotUsagesStream : options.slotUsagesStream !== void 0;
		case "then": return kind === "get" ? void 0 : UNHANDLED;
		case "toString": return kind === "get" ? Object.prototype.toString : UNHANDLED;
		case "valueOf": return kind === "get" ? Object.prototype.valueOf : UNHANDLED;
		case "constructor": return kind === "get" ? Object : UNHANDLED;
	}
	if (typeof prop === "symbol") return kind === "get" ? void 0 : false;
	return UNHANDLED;
}
function createRscProxyInternal(options) {
	const childCache = /* @__PURE__ */ new Map();
	const getChild = (key) => {
		const cached = childCache.get(key);
		if (cached) return cached;
		const next = createRscProxyInternal({
			...options,
			path: [...options.path, key]
		});
		childCache.set(key, next);
		return next;
	};
	const dataProxy = options.renderable ? createRscProxyInternal({
		...options,
		renderable: false
	}) : void 0;
	const proxyTarget = options.renderable ? createElement(RscNodeRenderer, { data: dataProxy }) : {};
	return new Proxy(proxyTarget, {
		get(target, prop) {
			const handled = handleProxyTrap("get", prop, options);
			if (handled !== UNHANDLED) return handled;
			if (options.renderable) {
				if (prop === "props") return target.props;
				if (prop === "data") return dataProxy;
				if (prop in target) return target[prop];
			}
			return getChild(String(prop));
		},
		has(target, prop) {
			const handled = handleProxyTrap("has", prop, options);
			if (handled !== UNHANDLED) return handled;
			if (options.renderable) {
				if (prop in target) return true;
				if (typeof prop === "string") return true;
				return false;
			}
			return true;
		},
		getPrototypeOf(target) {
			return options.renderable ? Object.getPrototypeOf(target) : Object.prototype;
		},
		getOwnPropertyDescriptor(target, prop) {
			return options.renderable ? Object.getOwnPropertyDescriptor(target, prop) : void 0;
		},
		ownKeys(target) {
			return options.renderable ? Reflect.ownKeys(target) : [];
		}
	});
}
/**
* Creates a React element that's also a Proxy for nested access.
* This is used by renderable RSCs so they work as both {data} and {data.foo.bar}.
*/
function createRenderableElement(getTree, path, stream, cssHrefs, jsPreloads) {
	return createRscProxyInternal({
		getTree,
		path,
		stream,
		cssHrefs,
		jsPreloads,
		renderable: true,
		slotUsages: void 0,
		slotUsagesStream: void 0
	});
}
function createRscProxyWithPath(getTree, path, stream, cssHrefs, jsPreloads, slotUsages, slotUsagesStream) {
	return createRscProxyInternal({
		getTree,
		path,
		stream,
		cssHrefs,
		jsPreloads,
		renderable: false,
		slotUsages,
		slotUsagesStream
	});
}
async function consumeSlotUsages(stream, slotUsages) {
	try {
		const reader = stream.getReader();
		for (;;) {
			const { value, done } = await reader.read();
			if (done) break;
			if (!value.slot) continue;
			slotUsages.push(value);
		}
	} catch {}
}
//#endregion
export { createRscProxy };

//# sourceMappingURL=createRscProxy.js.map