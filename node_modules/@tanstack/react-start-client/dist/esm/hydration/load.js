"use client";
import { jsx } from "react/jsx-runtime";
import * as React from "react";
import { load, withHydrationRenderer } from "@tanstack/start-client-core/hydration";
//#region src/hydration/load.tsx
function HydratedBoundary(props) {
	const { onHydrated, children } = props;
	const didHydrateRef = React.useRef(false);
	React.useEffect(() => {
		if (didHydrateRef.current) return;
		didHydrateRef.current = true;
		onHydrated?.();
	}, [onHydrated]);
	return children;
}
function LoadHydrate(props) {
	return /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(React.Suspense, {
		fallback: props.fallback ?? null,
		children: /* @__PURE__ */ jsx(HydratedBoundary, {
			onHydrated: props.onHydrated,
			children: props.children
		})
	}) });
}
var loadStrategy = /* @__PURE__ */ withHydrationRenderer(load(), LoadHydrate);
/* @__NO_SIDE_EFFECTS__ */
function load$1() {
	return loadStrategy;
}
//#endregion
export { load$1 as load };

//# sourceMappingURL=load.js.map