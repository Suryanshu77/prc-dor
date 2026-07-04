"use client";
import { reactUse, useHydrated, useLayoutEffect } from "@tanstack/react-router";
import { jsx } from "react/jsx-runtime";
import * as React from "react";
import { isServer } from "@tanstack/router-core/isServer";
import { listenForDelegatedHydrationIntent } from "@tanstack/start-client-core/hydration";
import { hydrateIdAttribute, hydrateWhenAttribute } from "@tanstack/start-client-core/hydration/constants";
import { createResolvedGate, getFallbackHtml, getOrCreateGate, onGateResolve, releaseGate, runHydrationStrategyCleanup, saveFallbackHtml, waitForHydrationPrefetchStrategy } from "@tanstack/start-client-core/hydration/runtime";
//#region src/GenericHydrate.tsx
var dynamicType = "dynamic";
var dynamicHydrateStrategy = {
	_t: dynamicType,
	_d: () => true
};
function shouldDeferHydration(strategy) {
	return strategy._d ? strategy._d() : strategy._t !== "load";
}
function useLatest(value) {
	const ref = React.useRef(value);
	ref.current = value;
	return ref;
}
function useHydrationGate(props) {
	const hydrated = useHydrated();
	const reactId = React.useId();
	const id = props.h ? `${props.h}${reactId}` : reactId;
	const when = props.when;
	const isDynamicHydrate = typeof when === "function";
	const dynamicHydrateStrategyRef = React.useRef(void 0);
	if (isDynamicHydrate) dynamicHydrateStrategyRef.current ??= isServer ?? typeof window === "undefined" ? dynamicHydrateStrategy : when();
	const hydrateStrategy = isDynamicHydrate ? dynamicHydrateStrategyRef.current : when;
	const markerHydrateType = isDynamicHydrate ? dynamicType : hydrateStrategy._t;
	const [prefetchError, setPrefetchError] = React.useState();
	const latestRef = useLatest({
		prefetch: props.prefetch,
		preload: props.p
	});
	const gateRef = React.useRef(void 0);
	const markerElementRef = React.useRef(null);
	const shouldPreserveServerHTMLRef = React.useRef(void 0);
	const shouldDeferInitialHydrationRef = React.useRef(void 0);
	const didPrefetchRef = React.useRef(false);
	const prefetchControllerRef = React.useRef(void 0);
	prefetchControllerRef.current ??= {
		abortController: new AbortController(),
		hydrationRequested: false,
		hydrationListeners: /* @__PURE__ */ new Set(),
		hydrationResolvePending: false,
		started: false
	};
	shouldPreserveServerHTMLRef.current ??= (isServer ?? typeof window === "undefined") || !hydrated;
	shouldDeferInitialHydrationRef.current ??= !hydrated && shouldDeferHydration(hydrateStrategy);
	if (!gateRef.current) gateRef.current = isServer ?? typeof window === "undefined" ? createResolvedGate(id, hydrateStrategy._t) : getOrCreateGate(id, hydrateStrategy._t);
	gateRef.current.when = hydrateStrategy._t;
	if (!(isServer ?? typeof window === "undefined") && hydrateStrategy._t !== "never" && (!shouldDeferInitialHydrationRef.current || !shouldDeferHydration(hydrateStrategy))) gateRef.current.resolve();
	const markerRef = React.useCallback((element) => {
		markerElementRef.current = element;
		if (element) {
			if (hydrateStrategy._t === "never" && !shouldPreserveServerHTMLRef.current) element.replaceChildren();
			saveFallbackHtml(id, element);
		}
	}, [hydrateStrategy._t, id]);
	React.useEffect(() => {
		const gate = gateRef.current;
		return () => {
			const controller = prefetchControllerRef.current;
			controller?.abortController.abort();
			controller?.cleanup?.();
			controller?.hydrationListeners.clear();
			releaseGate(gate);
		};
	}, []);
	React.useEffect(() => {
		if ((isServer ?? typeof window === "undefined") || !latestRef.current.prefetch) return;
		const controller = prefetchControllerRef.current;
		if (controller.started) return;
		controller.started = true;
		const onHydrate = (listener) => {
			if (controller.hydrationRequested) {
				listener();
				return () => {};
			}
			controller.hydrationListeners.add(listener);
			return () => {
				controller.hydrationListeners.delete(listener);
			};
		};
		const preload = () => latestRef.current.preload?.() ?? Promise.resolve();
		const prefetchInput = latestRef.current.prefetch;
		if (typeof prefetchInput === "function") {
			const promise = Promise.resolve().then(() => prefetchInput({
				element: markerElementRef.current,
				signal: controller.abortController.signal,
				preload,
				waitFor: (strategy) => waitForHydrationPrefetchStrategy(strategy, {
					element: markerElementRef.current,
					signal: controller.abortController.signal,
					onHydrate
				})
			})).then(() => void 0);
			controller.promise = promise;
			promise.catch((error) => {
				if (!controller.abortController.signal.aborted) setPrefetchError(error);
			});
			return;
		}
		if (!latestRef.current.preload) return;
		const prefetch = () => {
			if (didPrefetchRef.current) return;
			didPrefetchRef.current = true;
			preload();
		};
		controller.cleanup = runHydrationStrategyCleanup(prefetchInput._s?.({
			element: markerElementRef.current,
			prefetch
		}));
	}, [hydrateStrategy, latestRef]);
	useLayoutEffect(() => {
		const gate = gateRef.current;
		if (!shouldDeferInitialHydrationRef.current || hydrateStrategy._t === "never") return;
		if (gate.resolved) return;
		const cleanups = [];
		let removeResolveListener = () => {};
		let disposed = false;
		const resolveGate = gate.resolve;
		const cleanup = () => {
			if (disposed) return;
			disposed = true;
			if (gate.resolve === requestHydration) gate.resolve = resolveGate;
			removeResolveListener();
			cleanups.forEach((fn) => fn());
		};
		const addCleanup = (fn) => {
			if (!fn) return;
			if (disposed || gate.resolved) {
				fn();
				return;
			}
			cleanups.push(fn);
		};
		const requestHydration = () => {
			const controller = prefetchControllerRef.current;
			if (!controller.hydrationRequested) {
				controller.hydrationRequested = true;
				controller.hydrationListeners.forEach((listener) => listener());
				controller.hydrationListeners.clear();
			}
			if (!controller.promise) {
				resolveGate();
				return;
			}
			if (controller.hydrationResolvePending) return;
			controller.hydrationResolvePending = true;
			controller.promise.then(() => resolveGate(), (error) => {
				if (!controller.abortController.signal.aborted) setPrefetchError(error);
			});
		};
		gate.resolve = requestHydration;
		removeResolveListener = onGateResolve(gate, cleanup);
		const context = {
			element: markerElementRef.current,
			gate
		};
		addCleanup(runHydrationStrategyCleanup(hydrateStrategy._s?.(context)));
		if (hydrateStrategy._t !== "interaction") addCleanup(runHydrationStrategyCleanup(markerElementRef.current ? listenForDelegatedHydrationIntent(markerElementRef.current, context) : void 0));
		return cleanup;
	}, [hydrateStrategy, latestRef]);
	return {
		gate: gateRef.current,
		markerRef,
		markerElementRef,
		hydrateStrategy,
		markerHydrateType,
		prefetchError,
		shouldPreserveServerHTML: shouldPreserveServerHTMLRef.current
	};
}
function HydrationGate(props) {
	if (isServer ?? typeof window === "undefined") return props.children;
	if (props.gate.resolved) return props.children;
	if (!reactUse) throw props.gate.promise;
	reactUse(props.gate.promise);
	return props.children;
}
function HydratedBoundary(props) {
	const { id, onHydrated, onStrategyHydrated } = props;
	const didHydrateRef = React.useRef(false);
	React.useEffect(() => {
		if (didHydrateRef.current) return;
		didHydrateRef.current = true;
		onHydrated?.();
		onStrategyHydrated?.(id);
	}, [
		id,
		onHydrated,
		onStrategyHydrated
	]);
	return props.children;
}
function GenericHydrate(props) {
	const { gate, hydrateStrategy, markerHydrateType, markerElementRef, markerRef, prefetchError, shouldPreserveServerHTML } = useHydrationGate(props);
	if (prefetchError) throw prefetchError;
	const fallback = shouldPreserveServerHTML ? (() => {
		const html = getFallbackHtml(gate.id);
		return html ? /* @__PURE__ */ jsx("div", {
			style: { display: "contents" },
			dangerouslySetInnerHTML: { __html: html }
		}) : null;
	})() : props.fallback ?? null;
	const markerAttributes = markerHydrateType === dynamicType ? void 0 : hydrateStrategy._a?.();
	if (hydrateStrategy._t === "never" && !shouldPreserveServerHTML) return /* @__PURE__ */ jsx("div", {
		ref: markerRef,
		[hydrateIdAttribute]: gate.id,
		[hydrateWhenAttribute]: markerHydrateType,
		...markerAttributes,
		children: props.fallback ?? null
	});
	return /* @__PURE__ */ jsx("div", {
		ref: markerRef,
		[hydrateIdAttribute]: gate.id,
		[hydrateWhenAttribute]: markerHydrateType,
		...markerAttributes,
		children: /* @__PURE__ */ jsx(React.Suspense, {
			fallback,
			children: /* @__PURE__ */ jsx(HydrationGate, {
				gate,
				children: /* @__PURE__ */ jsx(HydratedBoundary, {
					id: gate.id,
					onHydrated: props.onHydrated,
					onStrategyHydrated: (id) => {
						markerElementRef.current?.removeAttribute(hydrateWhenAttribute);
						hydrateStrategy._o?.(id);
					},
					children: props.children
				})
			})
		})
	});
}
//#endregion
export { GenericHydrate };

//# sourceMappingURL=GenericHydrate.js.map