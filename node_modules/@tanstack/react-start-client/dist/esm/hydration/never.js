"use client";
import { reactUse, useHydrated } from "@tanstack/react-router";
import { jsx } from "react/jsx-runtime";
import * as React from "react";
import { isServer } from "@tanstack/router-core/isServer";
import { never, withHydrationRenderer } from "@tanstack/start-client-core/hydration";
import { hydrateIdAttribute, hydrateWhenAttribute } from "@tanstack/start-client-core/hydration/constants";
import { getFallbackHtml, saveFallbackHtml } from "@tanstack/start-client-core/hydration/runtime";
//#region src/hydration/never.tsx
var neverType = "never";
var neverPromise = new Promise(() => {});
function NeverGate(props) {
	if (isServer ?? typeof window === "undefined") return props.children;
	if (!reactUse) throw neverPromise;
	reactUse(neverPromise);
	return props.children;
}
function NeverHydrate(props) {
	const internalProps = props;
	const hydrated = useHydrated();
	const reactId = React.useId();
	const id = internalProps.h ? `${internalProps.h}${reactId}` : reactId;
	const shouldPreserveServerHTMLRef = React.useRef(void 0);
	shouldPreserveServerHTMLRef.current ??= (isServer ?? typeof window === "undefined") || !hydrated;
	const markerProps = {
		ref: React.useCallback((element) => {
			if (!element) return;
			if (!shouldPreserveServerHTMLRef.current) element.replaceChildren();
			else saveFallbackHtml(id, element);
		}, [id]),
		[hydrateIdAttribute]: id,
		[hydrateWhenAttribute]: neverType
	};
	const fallback = (() => {
		const html = getFallbackHtml(id);
		return html ? /* @__PURE__ */ jsx("div", {
			style: { display: "contents" },
			dangerouslySetInnerHTML: { __html: html }
		}) : props.fallback ?? null;
	})();
	return /* @__PURE__ */ jsx("div", {
		...markerProps,
		children: /* @__PURE__ */ jsx(React.Suspense, {
			fallback,
			children: /* @__PURE__ */ jsx(NeverGate, { children: props.children })
		})
	});
}
/* @__NO_SIDE_EFFECTS__ */
function never$1() {
	return /* @__PURE__ */ withHydrationRenderer(never(), NeverHydrate);
}
//#endregion
export { never$1 as never };

//# sourceMappingURL=never.js.map