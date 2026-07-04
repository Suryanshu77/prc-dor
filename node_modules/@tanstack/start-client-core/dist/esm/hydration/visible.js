//#region src/hydration/visible.ts
var visibleType = "visible";
var observerRegistry = /* @__PURE__ */ new Map();
function cleanupVisibleObserverEntry(observerEntry) {
	if (observerEntry.elements.size > 0) return;
	observerEntry.observer.disconnect();
	observerRegistry.delete(observerEntry.key);
}
/* @__NO_SIDE_EFFECTS__ */
function visible(options = {}) {
	const rootMargin = options.rootMargin ?? "600px";
	const threshold = options.threshold ?? 0;
	return {
		_t: visibleType,
		_s: ({ element, gate, prefetch }) => {
			const callback = prefetch ?? gate.resolve;
			if (!element) {
				callback();
				return;
			}
			const key = `${rootMargin}|${Array.isArray(threshold) ? threshold.join(",") : String(threshold)}`;
			let observerEntry = observerRegistry.get(key);
			if (!observerEntry) {
				const entry = {
					key,
					elements: /* @__PURE__ */ new Map(),
					observer: new IntersectionObserver((entries) => {
						for (const intersectingEntry of entries) {
							if (!intersectingEntry.isIntersecting) continue;
							const callbacks = entry.elements.get(intersectingEntry.target);
							if (!callbacks) continue;
							callbacks.forEach((callback) => callback());
							entry.elements.delete(intersectingEntry.target);
							entry.observer.unobserve(intersectingEntry.target);
							cleanupVisibleObserverEntry(entry);
						}
					}, {
						rootMargin,
						threshold
					})
				};
				observerRegistry.set(key, entry);
				observerEntry = entry;
			}
			let callbacks = observerEntry.elements.get(element);
			if (!callbacks) {
				callbacks = /* @__PURE__ */ new Set();
				observerEntry.elements.set(element, callbacks);
				observerEntry.observer.observe(element);
			}
			callbacks.add(callback);
			return () => {
				const currentCallbacks = observerEntry.elements.get(element);
				currentCallbacks?.delete(callback);
				if (currentCallbacks?.size === 0) {
					observerEntry.elements.delete(element);
					observerEntry.observer.unobserve(element);
				}
				cleanupVisibleObserverEntry(observerEntry);
			};
		}
	};
}
//#endregion
export { visible };

//# sourceMappingURL=visible.js.map