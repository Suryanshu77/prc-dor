"use client";
import { RSC_PROXY_GET_TREE, RSC_PROXY_PATH, SERVER_COMPONENT_CSS_HREFS, SERVER_COMPONENT_JS_PRELOADS } from "./ServerComponentTypes.js";
import { Suspense } from "react";
import ReactDOM from "react-dom";
import { Fragment, jsx } from "react/jsx-runtime";
//#region src/RscNodeRenderer.tsx
function EmptyFallback() {
	return null;
}
function RscNodeRenderInner({ getTree, path }) {
	let tree = getTree();
	for (const key of path) {
		if (tree === null || tree === void 0) return null;
		if (typeof tree !== "object") return null;
		tree = tree[key];
	}
	if (tree === null || tree === void 0) return null;
	return tree;
}
/**
* Renders a renderable RSC proxy without slot support.
* Used internally by the renderable proxy's $$typeof/type masquerade.
*/
function RscNodeRenderer({ data }) {
	const cssHrefs = data[SERVER_COMPONENT_CSS_HREFS];
	const jsPreloads = data[SERVER_COMPONENT_JS_PRELOADS];
	const path = data[RSC_PROXY_PATH] ?? [];
	const getTree = data[RSC_PROXY_GET_TREE];
	if (!getTree) throw new Error("[tanstack/start] RscNodeRenderer missing getTree on RSC data.");
	for (const href of cssHrefs ?? []) ReactDOM.preinit(href, {
		as: "style",
		precedence: "high"
	});
	if (jsPreloads) for (const href of jsPreloads) ReactDOM.preloadModule(href);
	return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx(EmptyFallback, {}),
		children: /* @__PURE__ */ jsx(RscNodeRenderInner, {
			getTree,
			path
		})
	}) });
}
//#endregion
export { RscNodeRenderer };

//# sourceMappingURL=RscNodeRenderer.js.map