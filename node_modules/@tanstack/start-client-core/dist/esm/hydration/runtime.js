import { hydrateIdAttribute, hydrateWhenAttribute } from "./constants.js";
//#region src/hydration/runtime.ts
var hydrateIdSelector = `[${hydrateIdAttribute}]`;
var gateRegistry = /* @__PURE__ */ new Map();
var resolvedGateIds = /* @__PURE__ */ new Set();
var fallbackHtmlByGateId = /* @__PURE__ */ new Map();
function createResolvedGate(id, when) {
	return {
		id,
		when,
		promise: Promise.resolve(),
		resolve: () => {},
		resolved: true,
		consumers: 0,
		resolveListeners: /* @__PURE__ */ new Set()
	};
}
function getOrCreateGate(id, when) {
	const existing = gateRegistry.get(id);
	if (existing?.when === when) {
		existing.consumers++;
		return existing;
	}
	let resolvePromise;
	const gate = {
		id,
		promise: new Promise((resolve) => {
			resolvePromise = resolve;
		}),
		resolved: false,
		consumers: 1,
		when,
		resolveListeners: /* @__PURE__ */ new Set(),
		resolve: () => {
			if (gate.resolved) return;
			gate.resolved = true;
			resolvePromise();
			gate.resolveListeners.forEach((listener) => listener());
			gate.resolveListeners.clear();
		}
	};
	gateRegistry.set(id, gate);
	if (when !== "never" && resolvedGateIds.has(id)) {
		resolvedGateIds.delete(id);
		gate.resolve();
	}
	return gate;
}
function releaseGate(gate) {
	resolvedGateIds.delete(gate.id);
	gate.consumers--;
	if (gate.consumers > 0) return;
	if (gateRegistry.get(gate.id) === gate) {
		gateRegistry.delete(gate.id);
		fallbackHtmlByGateId.delete(gate.id);
		gate.resolveListeners.clear();
	}
}
function onGateResolve(gate, listener) {
	if (gate.resolved) {
		listener();
		return () => {};
	}
	gate.resolveListeners.add(listener);
	return () => {
		gate.resolveListeners.delete(listener);
	};
}
function runHydrationStrategyCleanup(cleanup) {
	if (typeof cleanup === "function") return cleanup;
}
function waitForHydrationPrefetchStrategy(strategy, options) {
	if (options.signal.aborted) return Promise.resolve("abort");
	return new Promise((resolve) => {
		const state = { disposed: false };
		const cleanupStrategyRef = { current: void 0 };
		let cleanupHydrate = () => {};
		const finish = (reason) => {
			if (state.disposed) return;
			state.disposed = true;
			options.signal.removeEventListener("abort", onAbort);
			cleanupHydrate();
			runHydrationStrategyCleanup(cleanupStrategyRef.current)?.();
			resolve(reason);
		};
		const onAbort = () => finish("abort");
		options.signal.addEventListener("abort", onAbort, { once: true });
		cleanupHydrate = options.onHydrate(() => finish("hydrate"));
		const cleanupStrategy = strategy._s?.({
			element: options.element,
			prefetch: () => finish("prefetch")
		});
		cleanupStrategyRef.current = cleanupStrategy;
		if (state.disposed) runHydrationStrategyCleanup(cleanupStrategy)?.();
	});
}
function getMarkerGate(marker) {
	const id = marker.getAttribute(hydrateIdAttribute);
	return id ? gateRegistry.get(id) : void 0;
}
function resolveHydrationMarker(marker) {
	const id = marker.getAttribute(hydrateIdAttribute);
	const when = marker.getAttribute(hydrateWhenAttribute);
	if (!id || !when || when === "never") return;
	const gate = gateRegistry.get(id);
	if (gate) {
		if (gate.when !== "never") gate.resolve();
		return;
	}
	resolvedGateIds.add(id);
}
function clearResolvedGateIdsInMarker(marker) {
	const ownId = marker.getAttribute(hydrateIdAttribute);
	if (ownId) resolvedGateIds.delete(ownId);
	marker.querySelectorAll(hydrateIdSelector).forEach((childMarker) => {
		const childId = childMarker.getAttribute(hydrateIdAttribute);
		if (childId) resolvedGateIds.delete(childId);
	});
}
function saveFallbackHtml(id, element) {
	if (!fallbackHtmlByGateId.has(id)) fallbackHtmlByGateId.set(id, element.innerHTML);
}
function getFallbackHtml(id) {
	return fallbackHtmlByGateId.get(id);
}
//#endregion
export { clearResolvedGateIdsInMarker, createResolvedGate, getFallbackHtml, getMarkerGate, getOrCreateGate, onGateResolve, releaseGate, resolveHydrationMarker, runHydrationStrategyCleanup, saveFallbackHtml, waitForHydrationPrefetchStrategy };

//# sourceMappingURL=runtime.js.map