"use client";
import { reactUse } from "@tanstack/react-router";
import { jsx } from "react/jsx-runtime";
import * as React from "react";
import { isServer } from "@tanstack/router-core/isServer";
//#region src/hydration/visible.tsx
/* @__NO_SIDE_EFFECTS__ */
function HydrationBoundary(props) {
	const { g, o } = props;
	if (!g.r) {
		if (!reactUse) throw g.p;
		reactUse(g.p);
	}
	React.useEffect(() => {
		o?.();
	}, [o]);
	return props.children;
}
/* @__NO_SIDE_EFFECTS__ */
function VisibleHydrate(props) {
	const strategy = this;
	const prefetchStrategy = props.prefetch;
	const preload = props.p;
	const markerRef = React.useRef(null);
	const [gate] = React.useState(() => {
		let resolvePromise;
		const nextGate = {
			p: new Promise((resolve) => {
				resolvePromise = resolve;
			}),
			r: false,
			s: () => {
				nextGate.r = true;
				resolvePromise();
			}
		};
		if (isServer ?? typeof window === "undefined") nextGate.s();
		return nextGate;
	});
	React.useEffect(() => {
		if (!preload || typeof prefetchStrategy === "function") return;
		return prefetchStrategy?._s?.({
			element: markerRef.current,
			prefetch: preload
		});
	}, [prefetchStrategy, preload]);
	React.useEffect(() => {
		if (gate.r) return;
		return strategy._s?.({
			element: markerRef.current,
			gate
		});
	}, [gate, strategy]);
	return /* @__PURE__ */ jsx("div", {
		ref: markerRef,
		children: /* @__PURE__ */ jsx(React.Suspense, {
			fallback: props.fallback,
			children: /* @__PURE__ */ jsx(HydrationBoundary, {
				g: gate,
				o: props.onHydrated,
				children: props.children
			})
		})
	});
}
/* @__NO_SIDE_EFFECTS__ */
function visible(options) {
	const rootMargin = options?.rootMargin ?? "600px";
	const threshold = options?.threshold ?? 0;
	return {
		_s: ({ element, gate, prefetch }) => {
			const callback = prefetch || gate.s;
			if (!element) {
				callback();
				return;
			}
			const observer = new IntersectionObserver((entries) => {
				if (!entries[0].isIntersecting) return;
				observer.disconnect();
				callback();
			}, {
				rootMargin,
				threshold
			});
			observer.observe(element);
			return () => observer.disconnect();
		},
		_h: VisibleHydrate
	};
}
//#endregion
export { visible };

//# sourceMappingURL=visible.js.map