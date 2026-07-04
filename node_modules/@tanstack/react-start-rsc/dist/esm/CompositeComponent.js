"use client";
import { RSC_PROXY_GET_TREE, RSC_PROXY_PATH, SERVER_COMPONENT_CSS_HREFS, SERVER_COMPONENT_JS_PRELOADS, SERVER_COMPONENT_STREAM } from "./ServerComponentTypes.js";
import { SlotProvider } from "./SlotContext.js";
import { Suspense } from "react";
import ReactDOM from "react-dom";
import { Fragment, jsx } from "react/jsx-runtime";
//#region src/CompositeComponent.tsx
function splitSlotProps(props) {
	const { children, strict, ...slotProps } = props ?? {};
	return {
		implementations: {
			...slotProps,
			children
		},
		strict: strict === true
	};
}
function EmptyFallback() {
	return null;
}
function CompositeRenderInner({ getTree, path, slotProps }) {
	let tree = getTree();
	for (const key of path) {
		if (tree === null || tree === void 0) return null;
		if (typeof tree !== "object") return null;
		tree = tree[key];
	}
	if (tree === null || tree === void 0) return null;
	const { implementations, strict } = splitSlotProps(slotProps);
	return /* @__PURE__ */ jsx(SlotProvider, {
		implementations,
		strict,
		children: tree
	});
}
function CompositeRenderComponent({ getTree, path, slotProps, cssHrefs, jsPreloads }) {
	for (const href of cssHrefs ?? []) ReactDOM.preinit(href, {
		as: "style",
		precedence: "high"
	});
	if (jsPreloads) for (const href of jsPreloads) ReactDOM.preloadModule(href);
	return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx(Suspense, {
		fallback: /* @__PURE__ */ jsx(EmptyFallback, {}),
		children: /* @__PURE__ */ jsx(CompositeRenderInner, {
			getTree,
			path,
			slotProps
		})
	}) });
}
/**
* Renders composite RSC data with slot support.
*
* Use this component to render data from `createCompositeComponent`.
* Pass slot implementations as props to fill in ClientSlot placeholders.
*
* @example
* ```tsx
* const src = await createCompositeComponent((props) => (
*   <div>
*     <header>{props.header('Dashboard')}</header>
*     <main>{props.children}</main>
*   </div>
* ))
*
* // In route component
* return (
*   <CompositeComponent src={src} header={(title) => <h1>{title}</h1>}>
*     <p>Main content</p>
*   </CompositeComponent>
* )
* ```
*/
function CompositeComponent(props) {
	const { src, ...slotProps } = props;
	if (!src[SERVER_COMPONENT_STREAM]) throw new Error("[tanstack/start] <CompositeComponent> missing RSC stream on src");
	const cssHrefs = src[SERVER_COMPONENT_CSS_HREFS];
	const jsPreloads = src[SERVER_COMPONENT_JS_PRELOADS];
	const path = src[RSC_PROXY_PATH] ?? [];
	const getTree = src[RSC_PROXY_GET_TREE];
	if (!getTree) throw new Error("[tanstack/start] <CompositeComponent> missing getTree on RSC src. Make sure src comes from createCompositeComponent().");
	return /* @__PURE__ */ jsx(CompositeRenderComponent, {
		getTree,
		path,
		slotProps,
		cssHrefs,
		jsPreloads
	});
}
//#endregion
export { CompositeComponent };

//# sourceMappingURL=CompositeComponent.js.map