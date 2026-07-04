import { hydrateIdAttribute, hydrateInteractionEventsAttribute, hydrateWhenAttribute } from "./constants.js";
import { clearResolvedGateIdsInMarker, getMarkerGate, resolveHydrationMarker } from "./runtime.js";
//#region src/hydration/interaction.ts
var hydrateIdSelector = `[${hydrateIdAttribute}]`;
var defaultInteractionEvents = [
	"pointerenter",
	"focusin",
	"pointerdown",
	"click"
];
var supportedInteractionEvents = [
	"auxclick",
	"click",
	"contextmenu",
	"dblclick",
	"focusin",
	"keydown",
	"keyup",
	"mousedown",
	"mouseenter",
	"mouseover",
	"mouseup",
	"pointerdown",
	"pointerenter",
	"pointerover",
	"pointerup"
];
var interactionType = "interaction";
var dynamicType = "dynamic";
var delegatedHydrateSelector = `${`[${hydrateWhenAttribute}="${interactionType}"]`},[${hydrateWhenAttribute}="${dynamicType}"]`;
var replayEventsByGateId = /* @__PURE__ */ new Map();
function getIntentListenerEvents(marker, events) {
	const listenerEvents = new Set(events);
	marker.querySelectorAll(delegatedHydrateSelector).forEach((childMarker) => {
		if (childMarker.getAttribute("data-ts-hydrate-when") === dynamicType) {
			supportedInteractionEvents.forEach((eventName) => {
				listenerEvents.add(eventName);
			});
			return;
		}
		const attr = childMarker.getAttribute(hydrateInteractionEventsAttribute);
		for (const eventName of attr === null ? defaultInteractionEvents : attr.split(/\s+/).filter(Boolean)) listenerEvents.add(eventName);
	});
	return [...listenerEvents];
}
function queueHydrationReplayEvent(marker, event) {
	if (!event.bubbles) return;
	const id = marker.getAttribute(hydrateIdAttribute);
	const when = marker.getAttribute(hydrateWhenAttribute);
	if (!id || !when || when === "never") return;
	const target = event.target;
	if (!target) return;
	if (getMarkerGate(marker)?.resolved) return;
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();
	let targetPath = [];
	if (target instanceof Node && marker.contains(target)) {
		let node = target instanceof Element ? target : target.parentElement;
		while (node && node !== marker) {
			const parent = node.parentElement;
			if (!parent) {
				targetPath = [];
				break;
			}
			targetPath.push(Array.prototype.indexOf.call(parent.children, node));
			node = parent;
		}
		targetPath.reverse();
	}
	const pendingEvents = replayEventsByGateId.get(id) ?? [];
	pendingEvents.push({
		marker,
		targetPath,
		type: event.type,
		event
	});
	replayEventsByGateId.set(id, pendingEvents);
}
if (typeof document !== "undefined") {
	const onIntent = (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		let marker = target.closest(hydrateIdSelector);
		const markers = [];
		let shouldHandle = false;
		while (marker) {
			markers.push(marker);
			const when = marker.getAttribute(hydrateWhenAttribute);
			if (when === dynamicType) shouldHandle ||= event.type === "click";
			else if (when === interactionType) {
				const attr = marker.getAttribute(hydrateInteractionEventsAttribute);
				const events = attr === null ? defaultInteractionEvents : attr.split(/\s+/).filter(Boolean);
				shouldHandle ||= events.includes(event.type);
			}
			marker = marker.parentElement?.closest(hydrateIdSelector) ?? null;
		}
		if (!shouldHandle) return;
		markers.reverse();
		if (markers.every((marker) => getMarkerGate(marker))) return;
		markers.forEach((marker) => {
			queueHydrationReplayEvent(marker, event);
			resolveHydrationMarker(marker);
		});
	};
	supportedInteractionEvents.forEach((eventName) => {
		document.addEventListener(eventName, onIntent, true);
	});
}
function listenForIntent(element, events, context) {
	const onIntent = (event) => {
		const target = event.target;
		let marker;
		if (target instanceof Element) {
			const closestMarker = target.closest(hydrateIdSelector);
			marker = closestMarker && element.contains(closestMarker) ? closestMarker : element;
		} else marker = element;
		const markers = [];
		while (marker) {
			if (marker.hasAttribute("data-ts-hydrate-id")) markers.push(marker);
			if (marker === element) break;
			marker = marker.parentElement;
		}
		if (!markers.includes(element)) markers.push(element);
		markers.reverse();
		if (context.delegated && !markers.some((marker) => marker.getAttribute("data-ts-hydrate-when") === interactionType || marker.getAttribute("data-ts-hydrate-when") === dynamicType)) return;
		markers.forEach((marker) => {
			queueHydrationReplayEvent(marker, event);
			resolveHydrationMarker(marker);
		});
	};
	let disposed = false;
	events.forEach((eventName) => {
		element.addEventListener(eventName, onIntent, true);
	});
	return () => {
		if (disposed) return;
		disposed = true;
		events.forEach((eventName) => {
			element.removeEventListener(eventName, onIntent, true);
		});
	};
}
function listenForDelegatedHydrationIntent(element, context) {
	const listenerEvents = getIntentListenerEvents(element, []);
	if (!listenerEvents.length) return;
	const cleanupIntent = listenForIntent(element, listenerEvents, {
		...context,
		delegated: true
	});
	return () => {
		cleanupIntent();
		clearResolvedGateIdsInMarker(element);
	};
}
/* @__NO_SIDE_EFFECTS__ */
function interaction(options = {}) {
	let events = defaultInteractionEvents;
	if (options.events !== void 0) {
		const eventList = typeof options.events === "string" ? [options.events] : options.events;
		const normalizedEvents = [];
		const seen = /* @__PURE__ */ new Set();
		for (const eventName of eventList) {
			if (!eventName || seen.has(eventName)) continue;
			seen.add(eventName);
			normalizedEvents.push(eventName);
		}
		events = normalizedEvents;
	}
	const eventKey = events.join(" ");
	return {
		_t: interactionType,
		_s: (context) => {
			const element = context.element;
			if (!element) return;
			const prefetch = context.prefetch;
			if (prefetch) {
				if (!events.length) return;
				let disposed = false;
				events.forEach((eventName) => {
					element.addEventListener(eventName, prefetch, true);
				});
				return () => {
					if (disposed) return;
					disposed = true;
					events.forEach((eventName) => {
						element.removeEventListener(eventName, prefetch, true);
					});
				};
			}
			const listenerEvents = getIntentListenerEvents(element, events);
			const cleanupIntent = listenerEvents.length ? listenForIntent(element, listenerEvents, context) : void 0;
			return () => {
				cleanupIntent?.();
				clearResolvedGateIdsInMarker(element);
			};
		},
		_o: (id) => {
			globalThis.requestAnimationFrame(() => {
				const pendingEvents = replayEventsByGateId.get(id);
				if (!pendingEvents?.length) return;
				replayEventsByGateId.delete(id);
				for (const pendingEvent of pendingEvents) {
					let replayTarget = pendingEvent.marker;
					for (const index of pendingEvent.targetPath) {
						replayTarget = replayTarget.children[index] ?? null;
						if (!replayTarget) break;
					}
					const event = pendingEvent.event;
					replayTarget ??= pendingEvent.marker;
					replayTarget.dispatchEvent(event instanceof MouseEvent ? new MouseEvent(event.type, event) : event instanceof FocusEvent ? new FocusEvent(event.type, event) : new Event(event.type, event));
				}
			});
		},
		_a: () => options.events === void 0 ? void 0 : { [hydrateInteractionEventsAttribute]: eventKey }
	};
}
//#endregion
export { interaction, listenForDelegatedHydrationIntent };

//# sourceMappingURL=interaction.js.map