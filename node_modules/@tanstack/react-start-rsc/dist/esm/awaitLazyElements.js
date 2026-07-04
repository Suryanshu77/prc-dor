import { ReactElement, ReactLazy, ReactSuspense } from "./reactSymbols.js";
//#region src/awaitLazyElements.ts
/**
* Yields pending lazy element payloads from a tree, stopping at Suspense boundaries.
* Also collects CSS hrefs from <link rel="stylesheet" data-rsc-css-href> elements.
*/
function* findPendingLazyPayloads(obj, seen = /* @__PURE__ */ new Set(), cssCollector) {
	if (!obj || typeof obj !== "object") return;
	if (seen.has(obj)) return;
	seen.add(obj);
	const el = obj;
	if (el.$$typeof === ReactElement && el.type === ReactSuspense) return;
	if (el.$$typeof === ReactElement && el.type === "link" && el.props?.rel === "stylesheet") {
		let cssHref;
		if ("data-rsc-css-href" in el.props) cssHref = el.props.href;
		if (cssHref && cssCollector) cssCollector(cssHref);
	}
	if (el.$$typeof === ReactLazy) {
		const payload = el._payload;
		if (payload && typeof payload === "object" && (payload.status === "pending" || payload.status === "blocked") && typeof payload.then === "function") yield payload;
	}
	if (Array.isArray(obj)) for (const item of obj) yield* findPendingLazyPayloads(item, seen, cssCollector);
	else for (const key of Object.keys(obj)) if (key !== "_owner" && key !== "_store") yield* findPendingLazyPayloads(el[key], seen, cssCollector);
}
/**
* Wait for all lazy elements in a tree to be resolved.
* This ensures client component chunks are fully loaded before rendering,
* preventing Suspense boundaries from flashing during SWR navigation.
*
* Also collects CSS hrefs from <link rel="stylesheet" data-rsc-css-href>
* elements for preloading in <head>.
*
* @param tree - The tree to process
* @param cssCollector - Optional callback to collect CSS hrefs (server-only)
*/
async function awaitLazyElements(tree, cssCollector) {
	for (const payload of findPendingLazyPayloads(tree, /* @__PURE__ */ new Set(), cssCollector)) await Promise.resolve(payload).catch(() => {});
}
//#endregion
export { awaitLazyElements };

//# sourceMappingURL=awaitLazyElements.js.map