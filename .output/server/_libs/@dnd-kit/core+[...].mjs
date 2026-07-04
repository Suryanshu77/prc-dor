import { i as __toESM, t as __commonJSMin } from "../../_runtime.mjs";
import { i as require_react, n as LiveRegion, r as useAnnouncement, t as HiddenText } from "../dnd-kit__accessibility+react.mjs";
//#region node_modules/react-dom/cjs/react-dom.production.js
/**
* @license React
* react-dom.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_dom_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var React = require_react();
	function formatProdErrorMessage(code) {
		var url = "https://react.dev/errors/" + code;
		if (1 < arguments.length) {
			url += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var i = 2; i < arguments.length; i++) url += "&args[]=" + encodeURIComponent(arguments[i]);
		}
		return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function noop() {}
	var Internals = {
		d: {
			f: noop,
			r: function() {
				throw Error(formatProdErrorMessage(522));
			},
			D: noop,
			C: noop,
			L: noop,
			m: noop,
			X: noop,
			S: noop,
			M: noop
		},
		p: 0,
		findDOMNode: null
	}, REACT_PORTAL_TYPE = Symbol.for("react.portal");
	function createPortal$1(children, containerInfo, implementation) {
		var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
		return {
			$$typeof: REACT_PORTAL_TYPE,
			key: null == key ? null : "" + key,
			children,
			containerInfo,
			implementation
		};
	}
	var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function getCrossOriginStringAs(as, input) {
		if ("font" === as) return "";
		if ("string" === typeof input) return "use-credentials" === input ? input : "";
	}
	exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
	exports.createPortal = function(children, container) {
		var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
		if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType) throw Error(formatProdErrorMessage(299));
		return createPortal$1(children, container, null, key);
	};
	exports.flushSync = function(fn) {
		var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
		try {
			if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
		} finally {
			ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f();
		}
	};
	exports.preconnect = function(href, options) {
		"string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
	};
	exports.prefetchDNS = function(href) {
		"string" === typeof href && Internals.d.D(href);
	};
	exports.preinit = function(href, options) {
		if ("string" === typeof href && options && "string" === typeof options.as) {
			var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
			"style" === as ? Internals.d.S(href, "string" === typeof options.precedence ? options.precedence : void 0, {
				crossOrigin,
				integrity,
				fetchPriority
			}) : "script" === as && Internals.d.X(href, {
				crossOrigin,
				integrity,
				fetchPriority,
				nonce: "string" === typeof options.nonce ? options.nonce : void 0
			});
		}
	};
	exports.preinitModule = function(href, options) {
		if ("string" === typeof href) if ("object" === typeof options && null !== options) {
			if (null == options.as || "script" === options.as) {
				var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
				Internals.d.M(href, {
					crossOrigin,
					integrity: "string" === typeof options.integrity ? options.integrity : void 0,
					nonce: "string" === typeof options.nonce ? options.nonce : void 0
				});
			}
		} else options ?? Internals.d.M(href);
	};
	exports.preload = function(href, options) {
		if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
			var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
			Internals.d.L(href, as, {
				crossOrigin,
				integrity: "string" === typeof options.integrity ? options.integrity : void 0,
				nonce: "string" === typeof options.nonce ? options.nonce : void 0,
				type: "string" === typeof options.type ? options.type : void 0,
				fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
				referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
				imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
				imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
				media: "string" === typeof options.media ? options.media : void 0
			});
		}
	};
	exports.preloadModule = function(href, options) {
		if ("string" === typeof href) if (options) {
			var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
			Internals.d.m(href, {
				as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
				crossOrigin,
				integrity: "string" === typeof options.integrity ? options.integrity : void 0
			});
		} else Internals.d.m(href);
	};
	exports.requestFormReset = function(form) {
		Internals.d.r(form);
	};
	exports.unstable_batchedUpdates = function(fn, a) {
		return fn(a);
	};
	exports.useFormState = function(action, initialState, permalink) {
		return ReactSharedInternals.H.useFormState(action, initialState, permalink);
	};
	exports.useFormStatus = function() {
		return ReactSharedInternals.H.useHostTransitionStatus();
	};
	exports.version = "19.2.7";
}));
//#endregion
//#region node_modules/react-dom/index.js
var require_react_dom = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function checkDCE() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") return;
		try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
		} catch (err) {
			console.error(err);
		}
	}
	checkDCE();
	module.exports = require_react_dom_production();
}));
//#endregion
//#region node_modules/@dnd-kit/utilities/dist/utilities.esm.js
var import_react_dom = /* @__PURE__ */ __toESM(require_react_dom());
var import_react = /* @__PURE__ */ __toESM(require_react());
function useCombinedRefs() {
	for (var _len = arguments.length, refs = new Array(_len), _key = 0; _key < _len; _key++) refs[_key] = arguments[_key];
	return (0, import_react.useMemo)(() => (node) => {
		refs.forEach((ref) => ref(node));
	}, refs);
}
var canUseDOM = typeof window !== "undefined" && typeof window.document !== "undefined" && typeof window.document.createElement !== "undefined";
function isWindow(element) {
	const elementString = Object.prototype.toString.call(element);
	return elementString === "[object Window]" || elementString === "[object global]";
}
function isNode(node) {
	return "nodeType" in node;
}
function getWindow(target) {
	var _target$ownerDocument, _target$ownerDocument2;
	if (!target) return window;
	if (isWindow(target)) return target;
	if (!isNode(target)) return window;
	return (_target$ownerDocument = (_target$ownerDocument2 = target.ownerDocument) == null ? void 0 : _target$ownerDocument2.defaultView) != null ? _target$ownerDocument : window;
}
function isDocument(node) {
	const { Document } = getWindow(node);
	return node instanceof Document;
}
function isHTMLElement(node) {
	if (isWindow(node)) return false;
	return node instanceof getWindow(node).HTMLElement;
}
function isSVGElement(node) {
	return node instanceof getWindow(node).SVGElement;
}
function getOwnerDocument(target) {
	if (!target) return document;
	if (isWindow(target)) return target.document;
	if (!isNode(target)) return document;
	if (isDocument(target)) return target;
	if (isHTMLElement(target) || isSVGElement(target)) return target.ownerDocument;
	return document;
}
/**
* A hook that resolves to useEffect on the server and useLayoutEffect on the client
* @param callback {function} Callback function that is invoked when the dependencies of the hook change
*/
var useIsomorphicLayoutEffect = canUseDOM ? import_react.useLayoutEffect : import_react.useEffect;
function useEvent(handler) {
	const handlerRef = (0, import_react.useRef)(handler);
	useIsomorphicLayoutEffect(() => {
		handlerRef.current = handler;
	});
	return (0, import_react.useCallback)(function() {
		for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) args[_key] = arguments[_key];
		return handlerRef.current == null ? void 0 : handlerRef.current(...args);
	}, []);
}
function useInterval() {
	const intervalRef = (0, import_react.useRef)(null);
	return [(0, import_react.useCallback)((listener, duration) => {
		intervalRef.current = setInterval(listener, duration);
	}, []), (0, import_react.useCallback)(() => {
		if (intervalRef.current !== null) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, [])];
}
function useLatestValue(value, dependencies) {
	if (dependencies === void 0) dependencies = [value];
	const valueRef = (0, import_react.useRef)(value);
	useIsomorphicLayoutEffect(() => {
		if (valueRef.current !== value) valueRef.current = value;
	}, dependencies);
	return valueRef;
}
function useLazyMemo(callback, dependencies) {
	const valueRef = (0, import_react.useRef)();
	return (0, import_react.useMemo)(() => {
		const newValue = callback(valueRef.current);
		valueRef.current = newValue;
		return newValue;
	}, [...dependencies]);
}
function useNodeRef(onChange) {
	const onChangeHandler = useEvent(onChange);
	const node = (0, import_react.useRef)(null);
	return [node, (0, import_react.useCallback)((element) => {
		if (element !== node.current) onChangeHandler?.(element, node.current);
		node.current = element;
	}, [])];
}
function usePrevious(value) {
	const ref = (0, import_react.useRef)();
	(0, import_react.useEffect)(() => {
		ref.current = value;
	}, [value]);
	return ref.current;
}
var ids = {};
function useUniqueId(prefix, value) {
	return (0, import_react.useMemo)(() => {
		if (value) return value;
		const id = ids[prefix] == null ? 0 : ids[prefix] + 1;
		ids[prefix] = id;
		return prefix + "-" + id;
	}, [prefix, value]);
}
function createAdjustmentFn(modifier) {
	return function(object) {
		for (var _len = arguments.length, adjustments = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) adjustments[_key - 1] = arguments[_key];
		return adjustments.reduce((accumulator, adjustment) => {
			const entries = Object.entries(adjustment);
			for (const [key, valueAdjustment] of entries) {
				const value = accumulator[key];
				if (value != null) accumulator[key] = value + modifier * valueAdjustment;
			}
			return accumulator;
		}, { ...object });
	};
}
var add = /*#__PURE__*/ createAdjustmentFn(1);
var subtract = /*#__PURE__*/ createAdjustmentFn(-1);
function hasViewportRelativeCoordinates(event) {
	return "clientX" in event && "clientY" in event;
}
function isKeyboardEvent(event) {
	if (!event) return false;
	const { KeyboardEvent } = getWindow(event.target);
	return KeyboardEvent && event instanceof KeyboardEvent;
}
function isTouchEvent(event) {
	if (!event) return false;
	const { TouchEvent } = getWindow(event.target);
	return TouchEvent && event instanceof TouchEvent;
}
/**
* Returns the normalized x and y coordinates for mouse and touch events.
*/
function getEventCoordinates(event) {
	if (isTouchEvent(event)) {
		if (event.touches && event.touches.length) {
			const { clientX: x, clientY: y } = event.touches[0];
			return {
				x,
				y
			};
		} else if (event.changedTouches && event.changedTouches.length) {
			const { clientX: x, clientY: y } = event.changedTouches[0];
			return {
				x,
				y
			};
		}
	}
	if (hasViewportRelativeCoordinates(event)) return {
		x: event.clientX,
		y: event.clientY
	};
	return null;
}
var CSS = /*#__PURE__*/ Object.freeze({
	Translate: { toString(transform) {
		if (!transform) return;
		const { x, y } = transform;
		return "translate3d(" + (x ? Math.round(x) : 0) + "px, " + (y ? Math.round(y) : 0) + "px, 0)";
	} },
	Scale: { toString(transform) {
		if (!transform) return;
		const { scaleX, scaleY } = transform;
		return "scaleX(" + scaleX + ") scaleY(" + scaleY + ")";
	} },
	Transform: { toString(transform) {
		if (!transform) return;
		return [CSS.Translate.toString(transform), CSS.Scale.toString(transform)].join(" ");
	} },
	Transition: { toString(_ref) {
		let { property, duration, easing } = _ref;
		return property + " " + duration + "ms " + easing;
	} }
});
var SELECTOR = "a,frame,iframe,input:not([type=hidden]):not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled),*[tabindex]";
function findFirstFocusableNode(element) {
	if (element.matches(SELECTOR)) return element;
	return element.querySelector(SELECTOR);
}
//#endregion
//#region node_modules/@dnd-kit/core/dist/core.esm.js
var DndMonitorContext = /*#__PURE__*/ (0, import_react.createContext)(null);
function useDndMonitor(listener) {
	const registerListener = (0, import_react.useContext)(DndMonitorContext);
	(0, import_react.useEffect)(() => {
		if (!registerListener) throw new Error("useDndMonitor must be used within a children of <DndContext>");
		return registerListener(listener);
	}, [listener, registerListener]);
}
function useDndMonitorProvider() {
	const [listeners] = (0, import_react.useState)(() => /* @__PURE__ */ new Set());
	const registerListener = (0, import_react.useCallback)((listener) => {
		listeners.add(listener);
		return () => listeners.delete(listener);
	}, [listeners]);
	return [(0, import_react.useCallback)((_ref) => {
		let { type, event } = _ref;
		listeners.forEach((listener) => {
			var _listener$type;
			return (_listener$type = listener[type]) == null ? void 0 : _listener$type.call(listener, event);
		});
	}, [listeners]), registerListener];
}
var defaultScreenReaderInstructions = { draggable: "\n    To pick up a draggable item, press the space bar.\n    While dragging, use the arrow keys to move the item.\n    Press space again to drop the item in its new position, or press escape to cancel.\n  " };
var defaultAnnouncements = {
	onDragStart(_ref) {
		let { active } = _ref;
		return "Picked up draggable item " + active.id + ".";
	},
	onDragOver(_ref2) {
		let { active, over } = _ref2;
		if (over) return "Draggable item " + active.id + " was moved over droppable area " + over.id + ".";
		return "Draggable item " + active.id + " is no longer over a droppable area.";
	},
	onDragEnd(_ref3) {
		let { active, over } = _ref3;
		if (over) return "Draggable item " + active.id + " was dropped over droppable area " + over.id;
		return "Draggable item " + active.id + " was dropped.";
	},
	onDragCancel(_ref4) {
		let { active } = _ref4;
		return "Dragging was cancelled. Draggable item " + active.id + " was dropped.";
	}
};
function Accessibility(_ref) {
	let { announcements = defaultAnnouncements, container, hiddenTextDescribedById, screenReaderInstructions = defaultScreenReaderInstructions } = _ref;
	const { announce, announcement } = useAnnouncement();
	const liveRegionId = useUniqueId("DndLiveRegion");
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setMounted(true);
	}, []);
	useDndMonitor((0, import_react.useMemo)(() => ({
		onDragStart(_ref2) {
			let { active } = _ref2;
			announce(announcements.onDragStart({ active }));
		},
		onDragMove(_ref3) {
			let { active, over } = _ref3;
			if (announcements.onDragMove) announce(announcements.onDragMove({
				active,
				over
			}));
		},
		onDragOver(_ref4) {
			let { active, over } = _ref4;
			announce(announcements.onDragOver({
				active,
				over
			}));
		},
		onDragEnd(_ref5) {
			let { active, over } = _ref5;
			announce(announcements.onDragEnd({
				active,
				over
			}));
		},
		onDragCancel(_ref6) {
			let { active, over } = _ref6;
			announce(announcements.onDragCancel({
				active,
				over
			}));
		}
	}), [announce, announcements]));
	if (!mounted) return null;
	const markup = import_react.createElement(import_react.Fragment, null, import_react.createElement(HiddenText, {
		id: hiddenTextDescribedById,
		value: screenReaderInstructions.draggable
	}), import_react.createElement(LiveRegion, {
		id: liveRegionId,
		announcement
	}));
	return container ? (0, import_react_dom.createPortal)(markup, container) : markup;
}
var Action;
(function(Action) {
	Action["DragStart"] = "dragStart";
	Action["DragMove"] = "dragMove";
	Action["DragEnd"] = "dragEnd";
	Action["DragCancel"] = "dragCancel";
	Action["DragOver"] = "dragOver";
	Action["RegisterDroppable"] = "registerDroppable";
	Action["SetDroppableDisabled"] = "setDroppableDisabled";
	Action["UnregisterDroppable"] = "unregisterDroppable";
})(Action || (Action = {}));
function noop() {}
function useSensor(sensor, options) {
	return (0, import_react.useMemo)(() => ({
		sensor,
		options: options != null ? options : {}
	}), [sensor, options]);
}
function useSensors() {
	for (var _len = arguments.length, sensors = new Array(_len), _key = 0; _key < _len; _key++) sensors[_key] = arguments[_key];
	return (0, import_react.useMemo)(() => [...sensors].filter((sensor) => sensor != null), [...sensors]);
}
var defaultCoordinates = /*#__PURE__*/ Object.freeze({
	x: 0,
	y: 0
});
/**
* Returns the distance between two points
*/
function distanceBetween(p1, p2) {
	return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
/**
* Sort collisions from smallest to greatest value
*/
function sortCollisionsAsc(_ref, _ref2) {
	let { data: { value: a } } = _ref;
	let { data: { value: b } } = _ref2;
	return a - b;
}
/**
* Sort collisions from greatest to smallest value
*/
function sortCollisionsDesc(_ref3, _ref4) {
	let { data: { value: a } } = _ref3;
	let { data: { value: b } } = _ref4;
	return b - a;
}
function getFirstCollision(collisions, property) {
	if (!collisions || collisions.length === 0) return null;
	const [firstCollision] = collisions;
	return property ? firstCollision[property] : firstCollision;
}
/**
* Returns the coordinates of the center of a given ClientRect
*/
function centerOfRectangle(rect, left, top) {
	if (left === void 0) left = rect.left;
	if (top === void 0) top = rect.top;
	return {
		x: left + rect.width * .5,
		y: top + rect.height * .5
	};
}
/**
* Returns the closest rectangles from an array of rectangles to the center of a given
* rectangle.
*/
var closestCenter = (_ref) => {
	let { collisionRect, droppableRects, droppableContainers } = _ref;
	const centerRect = centerOfRectangle(collisionRect, collisionRect.left, collisionRect.top);
	const collisions = [];
	for (const droppableContainer of droppableContainers) {
		const { id } = droppableContainer;
		const rect = droppableRects.get(id);
		if (rect) {
			const distBetween = distanceBetween(centerOfRectangle(rect), centerRect);
			collisions.push({
				id,
				data: {
					droppableContainer,
					value: distBetween
				}
			});
		}
	}
	return collisions.sort(sortCollisionsAsc);
};
/**
* Returns the intersecting rectangle area between two rectangles
*/
function getIntersectionRatio(entry, target) {
	const top = Math.max(target.top, entry.top);
	const left = Math.max(target.left, entry.left);
	const right = Math.min(target.left + target.width, entry.left + entry.width);
	const bottom = Math.min(target.top + target.height, entry.top + entry.height);
	const width = right - left;
	const height = bottom - top;
	if (left < right && top < bottom) {
		const targetArea = target.width * target.height;
		const entryArea = entry.width * entry.height;
		const intersectionArea = width * height;
		const intersectionRatio = intersectionArea / (targetArea + entryArea - intersectionArea);
		return Number(intersectionRatio.toFixed(4));
	}
	return 0;
}
/**
* Returns the rectangles that has the greatest intersection area with a given
* rectangle in an array of rectangles.
*/
var rectIntersection = (_ref) => {
	let { collisionRect, droppableRects, droppableContainers } = _ref;
	const collisions = [];
	for (const droppableContainer of droppableContainers) {
		const { id } = droppableContainer;
		const rect = droppableRects.get(id);
		if (rect) {
			const intersectionRatio = getIntersectionRatio(rect, collisionRect);
			if (intersectionRatio > 0) collisions.push({
				id,
				data: {
					droppableContainer,
					value: intersectionRatio
				}
			});
		}
	}
	return collisions.sort(sortCollisionsDesc);
};
function adjustScale(transform, rect1, rect2) {
	return {
		...transform,
		scaleX: rect1 && rect2 ? rect1.width / rect2.width : 1,
		scaleY: rect1 && rect2 ? rect1.height / rect2.height : 1
	};
}
function getRectDelta(rect1, rect2) {
	return rect1 && rect2 ? {
		x: rect1.left - rect2.left,
		y: rect1.top - rect2.top
	} : defaultCoordinates;
}
function createRectAdjustmentFn(modifier) {
	return function adjustClientRect(rect) {
		for (var _len = arguments.length, adjustments = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) adjustments[_key - 1] = arguments[_key];
		return adjustments.reduce((acc, adjustment) => ({
			...acc,
			top: acc.top + modifier * adjustment.y,
			bottom: acc.bottom + modifier * adjustment.y,
			left: acc.left + modifier * adjustment.x,
			right: acc.right + modifier * adjustment.x
		}), { ...rect });
	};
}
var getAdjustedRect = /*#__PURE__*/ createRectAdjustmentFn(1);
function parseTransform(transform) {
	if (transform.startsWith("matrix3d(")) {
		const transformArray = transform.slice(9, -1).split(/, /);
		return {
			x: +transformArray[12],
			y: +transformArray[13],
			scaleX: +transformArray[0],
			scaleY: +transformArray[5]
		};
	} else if (transform.startsWith("matrix(")) {
		const transformArray = transform.slice(7, -1).split(/, /);
		return {
			x: +transformArray[4],
			y: +transformArray[5],
			scaleX: +transformArray[0],
			scaleY: +transformArray[3]
		};
	}
	return null;
}
function inverseTransform(rect, transform, transformOrigin) {
	const parsedTransform = parseTransform(transform);
	if (!parsedTransform) return rect;
	const { scaleX, scaleY, x: translateX, y: translateY } = parsedTransform;
	const x = rect.left - translateX - (1 - scaleX) * parseFloat(transformOrigin);
	const y = rect.top - translateY - (1 - scaleY) * parseFloat(transformOrigin.slice(transformOrigin.indexOf(" ") + 1));
	const w = scaleX ? rect.width / scaleX : rect.width;
	const h = scaleY ? rect.height / scaleY : rect.height;
	return {
		width: w,
		height: h,
		top: y,
		right: x + w,
		bottom: y + h,
		left: x
	};
}
var defaultOptions = { ignoreTransform: false };
/**
* Returns the bounding client rect of an element relative to the viewport.
*/
function getClientRect(element, options) {
	if (options === void 0) options = defaultOptions;
	let rect = element.getBoundingClientRect();
	if (options.ignoreTransform) {
		const { transform, transformOrigin } = getWindow(element).getComputedStyle(element);
		if (transform) rect = inverseTransform(rect, transform, transformOrigin);
	}
	const { top, left, width, height, bottom, right } = rect;
	return {
		top,
		left,
		width,
		height,
		bottom,
		right
	};
}
/**
* Returns the bounding client rect of an element relative to the viewport.
*
* @remarks
* The ClientRect returned by this method does not take into account transforms
* applied to the element it measures.
*
*/
function getTransformAgnosticClientRect(element) {
	return getClientRect(element, { ignoreTransform: true });
}
function getWindowClientRect(element) {
	const width = element.innerWidth;
	const height = element.innerHeight;
	return {
		top: 0,
		left: 0,
		right: width,
		bottom: height,
		width,
		height
	};
}
function isFixed(node, computedStyle) {
	if (computedStyle === void 0) computedStyle = getWindow(node).getComputedStyle(node);
	return computedStyle.position === "fixed";
}
function isScrollable(element, computedStyle) {
	if (computedStyle === void 0) computedStyle = getWindow(element).getComputedStyle(element);
	const overflowRegex = /(auto|scroll|overlay)/;
	return [
		"overflow",
		"overflowX",
		"overflowY"
	].some((property) => {
		const value = computedStyle[property];
		return typeof value === "string" ? overflowRegex.test(value) : false;
	});
}
function getScrollableAncestors(element, limit) {
	const scrollParents = [];
	function findScrollableAncestors(node) {
		if (limit != null && scrollParents.length >= limit) return scrollParents;
		if (!node) return scrollParents;
		if (isDocument(node) && node.scrollingElement != null && !scrollParents.includes(node.scrollingElement)) {
			scrollParents.push(node.scrollingElement);
			return scrollParents;
		}
		if (!isHTMLElement(node) || isSVGElement(node)) return scrollParents;
		if (scrollParents.includes(node)) return scrollParents;
		const computedStyle = getWindow(element).getComputedStyle(node);
		if (node !== element) {
			if (isScrollable(node, computedStyle)) scrollParents.push(node);
		}
		if (isFixed(node, computedStyle)) return scrollParents;
		return findScrollableAncestors(node.parentNode);
	}
	if (!element) return scrollParents;
	return findScrollableAncestors(element);
}
function getFirstScrollableAncestor(node) {
	const [firstScrollableAncestor] = getScrollableAncestors(node, 1);
	return firstScrollableAncestor != null ? firstScrollableAncestor : null;
}
function getScrollableElement(element) {
	if (!canUseDOM || !element) return null;
	if (isWindow(element)) return element;
	if (!isNode(element)) return null;
	if (isDocument(element) || element === getOwnerDocument(element).scrollingElement) return window;
	if (isHTMLElement(element)) return element;
	return null;
}
function getScrollXCoordinate(element) {
	if (isWindow(element)) return element.scrollX;
	return element.scrollLeft;
}
function getScrollYCoordinate(element) {
	if (isWindow(element)) return element.scrollY;
	return element.scrollTop;
}
function getScrollCoordinates(element) {
	return {
		x: getScrollXCoordinate(element),
		y: getScrollYCoordinate(element)
	};
}
var Direction;
(function(Direction) {
	Direction[Direction["Forward"] = 1] = "Forward";
	Direction[Direction["Backward"] = -1] = "Backward";
})(Direction || (Direction = {}));
function isDocumentScrollingElement(element) {
	if (!canUseDOM || !element) return false;
	return element === document.scrollingElement;
}
function getScrollPosition(scrollingContainer) {
	const minScroll = {
		x: 0,
		y: 0
	};
	const dimensions = isDocumentScrollingElement(scrollingContainer) ? {
		height: window.innerHeight,
		width: window.innerWidth
	} : {
		height: scrollingContainer.clientHeight,
		width: scrollingContainer.clientWidth
	};
	const maxScroll = {
		x: scrollingContainer.scrollWidth - dimensions.width,
		y: scrollingContainer.scrollHeight - dimensions.height
	};
	return {
		isTop: scrollingContainer.scrollTop <= minScroll.y,
		isLeft: scrollingContainer.scrollLeft <= minScroll.x,
		isBottom: scrollingContainer.scrollTop >= maxScroll.y,
		isRight: scrollingContainer.scrollLeft >= maxScroll.x,
		maxScroll,
		minScroll
	};
}
var defaultThreshold = {
	x: .2,
	y: .2
};
function getScrollDirectionAndSpeed(scrollContainer, scrollContainerRect, _ref, acceleration, thresholdPercentage) {
	let { top, left, right, bottom } = _ref;
	if (acceleration === void 0) acceleration = 10;
	if (thresholdPercentage === void 0) thresholdPercentage = defaultThreshold;
	const { isTop, isBottom, isLeft, isRight } = getScrollPosition(scrollContainer);
	const direction = {
		x: 0,
		y: 0
	};
	const speed = {
		x: 0,
		y: 0
	};
	const threshold = {
		height: scrollContainerRect.height * thresholdPercentage.y,
		width: scrollContainerRect.width * thresholdPercentage.x
	};
	if (!isTop && top <= scrollContainerRect.top + threshold.height) {
		direction.y = Direction.Backward;
		speed.y = acceleration * Math.abs((scrollContainerRect.top + threshold.height - top) / threshold.height);
	} else if (!isBottom && bottom >= scrollContainerRect.bottom - threshold.height) {
		direction.y = Direction.Forward;
		speed.y = acceleration * Math.abs((scrollContainerRect.bottom - threshold.height - bottom) / threshold.height);
	}
	if (!isRight && right >= scrollContainerRect.right - threshold.width) {
		direction.x = Direction.Forward;
		speed.x = acceleration * Math.abs((scrollContainerRect.right - threshold.width - right) / threshold.width);
	} else if (!isLeft && left <= scrollContainerRect.left + threshold.width) {
		direction.x = Direction.Backward;
		speed.x = acceleration * Math.abs((scrollContainerRect.left + threshold.width - left) / threshold.width);
	}
	return {
		direction,
		speed
	};
}
function getScrollElementRect(element) {
	if (element === document.scrollingElement) {
		const { innerWidth, innerHeight } = window;
		return {
			top: 0,
			left: 0,
			right: innerWidth,
			bottom: innerHeight,
			width: innerWidth,
			height: innerHeight
		};
	}
	const { top, left, right, bottom } = element.getBoundingClientRect();
	return {
		top,
		left,
		right,
		bottom,
		width: element.clientWidth,
		height: element.clientHeight
	};
}
function getScrollOffsets(scrollableAncestors) {
	return scrollableAncestors.reduce((acc, node) => {
		return add(acc, getScrollCoordinates(node));
	}, defaultCoordinates);
}
function getScrollXOffset(scrollableAncestors) {
	return scrollableAncestors.reduce((acc, node) => {
		return acc + getScrollXCoordinate(node);
	}, 0);
}
function getScrollYOffset(scrollableAncestors) {
	return scrollableAncestors.reduce((acc, node) => {
		return acc + getScrollYCoordinate(node);
	}, 0);
}
function scrollIntoViewIfNeeded(element, measure) {
	if (measure === void 0) measure = getClientRect;
	if (!element) return;
	const { top, left, bottom, right } = measure(element);
	if (!getFirstScrollableAncestor(element)) return;
	if (bottom <= 0 || right <= 0 || top >= window.innerHeight || left >= window.innerWidth) element.scrollIntoView({
		block: "center",
		inline: "center"
	});
}
var properties = [[
	"x",
	["left", "right"],
	getScrollXOffset
], [
	"y",
	["top", "bottom"],
	getScrollYOffset
]];
var Rect = class {
	constructor(rect, element) {
		this.rect = void 0;
		this.width = void 0;
		this.height = void 0;
		this.top = void 0;
		this.bottom = void 0;
		this.right = void 0;
		this.left = void 0;
		const scrollableAncestors = getScrollableAncestors(element);
		const scrollOffsets = getScrollOffsets(scrollableAncestors);
		this.rect = { ...rect };
		this.width = rect.width;
		this.height = rect.height;
		for (const [axis, keys, getScrollOffset] of properties) for (const key of keys) Object.defineProperty(this, key, {
			get: () => {
				const currentOffsets = getScrollOffset(scrollableAncestors);
				const scrollOffsetsDeltla = scrollOffsets[axis] - currentOffsets;
				return this.rect[key] + scrollOffsetsDeltla;
			},
			enumerable: true
		});
		Object.defineProperty(this, "rect", { enumerable: false });
	}
};
var Listeners = class {
	constructor(target) {
		this.target = void 0;
		this.listeners = [];
		this.removeAll = () => {
			this.listeners.forEach((listener) => {
				var _this$target;
				return (_this$target = this.target) == null ? void 0 : _this$target.removeEventListener(...listener);
			});
		};
		this.target = target;
	}
	add(eventName, handler, options) {
		var _this$target2;
		(_this$target2 = this.target) == null || _this$target2.addEventListener(eventName, handler, options);
		this.listeners.push([
			eventName,
			handler,
			options
		]);
	}
};
function getEventListenerTarget(target) {
	const { EventTarget } = getWindow(target);
	return target instanceof EventTarget ? target : getOwnerDocument(target);
}
function hasExceededDistance(delta, measurement) {
	const dx = Math.abs(delta.x);
	const dy = Math.abs(delta.y);
	if (typeof measurement === "number") return Math.sqrt(dx ** 2 + dy ** 2) > measurement;
	if ("x" in measurement && "y" in measurement) return dx > measurement.x && dy > measurement.y;
	if ("x" in measurement) return dx > measurement.x;
	if ("y" in measurement) return dy > measurement.y;
	return false;
}
var EventName;
(function(EventName) {
	EventName["Click"] = "click";
	EventName["DragStart"] = "dragstart";
	EventName["Keydown"] = "keydown";
	EventName["ContextMenu"] = "contextmenu";
	EventName["Resize"] = "resize";
	EventName["SelectionChange"] = "selectionchange";
	EventName["VisibilityChange"] = "visibilitychange";
})(EventName || (EventName = {}));
function preventDefault(event) {
	event.preventDefault();
}
function stopPropagation(event) {
	event.stopPropagation();
}
var KeyboardCode;
(function(KeyboardCode) {
	KeyboardCode["Space"] = "Space";
	KeyboardCode["Down"] = "ArrowDown";
	KeyboardCode["Right"] = "ArrowRight";
	KeyboardCode["Left"] = "ArrowLeft";
	KeyboardCode["Up"] = "ArrowUp";
	KeyboardCode["Esc"] = "Escape";
	KeyboardCode["Enter"] = "Enter";
	KeyboardCode["Tab"] = "Tab";
})(KeyboardCode || (KeyboardCode = {}));
var defaultKeyboardCodes = {
	start: [KeyboardCode.Space, KeyboardCode.Enter],
	cancel: [KeyboardCode.Esc],
	end: [
		KeyboardCode.Space,
		KeyboardCode.Enter,
		KeyboardCode.Tab
	]
};
var defaultKeyboardCoordinateGetter = (event, _ref) => {
	let { currentCoordinates } = _ref;
	switch (event.code) {
		case KeyboardCode.Right: return {
			...currentCoordinates,
			x: currentCoordinates.x + 25
		};
		case KeyboardCode.Left: return {
			...currentCoordinates,
			x: currentCoordinates.x - 25
		};
		case KeyboardCode.Down: return {
			...currentCoordinates,
			y: currentCoordinates.y + 25
		};
		case KeyboardCode.Up: return {
			...currentCoordinates,
			y: currentCoordinates.y - 25
		};
	}
};
var KeyboardSensor = class {
	constructor(props) {
		this.props = void 0;
		this.autoScrollEnabled = false;
		this.referenceCoordinates = void 0;
		this.listeners = void 0;
		this.windowListeners = void 0;
		this.props = props;
		const { event: { target } } = props;
		this.props = props;
		this.listeners = new Listeners(getOwnerDocument(target));
		this.windowListeners = new Listeners(getWindow(target));
		this.handleKeyDown = this.handleKeyDown.bind(this);
		this.handleCancel = this.handleCancel.bind(this);
		this.attach();
	}
	attach() {
		this.handleStart();
		this.windowListeners.add(EventName.Resize, this.handleCancel);
		this.windowListeners.add(EventName.VisibilityChange, this.handleCancel);
		setTimeout(() => this.listeners.add(EventName.Keydown, this.handleKeyDown));
	}
	handleStart() {
		const { activeNode, onStart } = this.props;
		const node = activeNode.node.current;
		if (node) scrollIntoViewIfNeeded(node);
		onStart(defaultCoordinates);
	}
	handleKeyDown(event) {
		if (isKeyboardEvent(event)) {
			const { active, context, options } = this.props;
			const { keyboardCodes = defaultKeyboardCodes, coordinateGetter = defaultKeyboardCoordinateGetter, scrollBehavior = "smooth" } = options;
			const { code } = event;
			if (keyboardCodes.end.includes(code)) {
				this.handleEnd(event);
				return;
			}
			if (keyboardCodes.cancel.includes(code)) {
				this.handleCancel(event);
				return;
			}
			const { collisionRect } = context.current;
			const currentCoordinates = collisionRect ? {
				x: collisionRect.left,
				y: collisionRect.top
			} : defaultCoordinates;
			if (!this.referenceCoordinates) this.referenceCoordinates = currentCoordinates;
			const newCoordinates = coordinateGetter(event, {
				active,
				context: context.current,
				currentCoordinates
			});
			if (newCoordinates) {
				const coordinatesDelta = subtract(newCoordinates, currentCoordinates);
				const scrollDelta = {
					x: 0,
					y: 0
				};
				const { scrollableAncestors } = context.current;
				for (const scrollContainer of scrollableAncestors) {
					const direction = event.code;
					const { isTop, isRight, isLeft, isBottom, maxScroll, minScroll } = getScrollPosition(scrollContainer);
					const scrollElementRect = getScrollElementRect(scrollContainer);
					const clampedCoordinates = {
						x: Math.min(direction === KeyboardCode.Right ? scrollElementRect.right - scrollElementRect.width / 2 : scrollElementRect.right, Math.max(direction === KeyboardCode.Right ? scrollElementRect.left : scrollElementRect.left + scrollElementRect.width / 2, newCoordinates.x)),
						y: Math.min(direction === KeyboardCode.Down ? scrollElementRect.bottom - scrollElementRect.height / 2 : scrollElementRect.bottom, Math.max(direction === KeyboardCode.Down ? scrollElementRect.top : scrollElementRect.top + scrollElementRect.height / 2, newCoordinates.y))
					};
					const canScrollX = direction === KeyboardCode.Right && !isRight || direction === KeyboardCode.Left && !isLeft;
					const canScrollY = direction === KeyboardCode.Down && !isBottom || direction === KeyboardCode.Up && !isTop;
					if (canScrollX && clampedCoordinates.x !== newCoordinates.x) {
						const newScrollCoordinates = scrollContainer.scrollLeft + coordinatesDelta.x;
						const canScrollToNewCoordinates = direction === KeyboardCode.Right && newScrollCoordinates <= maxScroll.x || direction === KeyboardCode.Left && newScrollCoordinates >= minScroll.x;
						if (canScrollToNewCoordinates && !coordinatesDelta.y) {
							scrollContainer.scrollTo({
								left: newScrollCoordinates,
								behavior: scrollBehavior
							});
							return;
						}
						if (canScrollToNewCoordinates) scrollDelta.x = scrollContainer.scrollLeft - newScrollCoordinates;
						else scrollDelta.x = direction === KeyboardCode.Right ? scrollContainer.scrollLeft - maxScroll.x : scrollContainer.scrollLeft - minScroll.x;
						if (scrollDelta.x) scrollContainer.scrollBy({
							left: -scrollDelta.x,
							behavior: scrollBehavior
						});
						break;
					} else if (canScrollY && clampedCoordinates.y !== newCoordinates.y) {
						const newScrollCoordinates = scrollContainer.scrollTop + coordinatesDelta.y;
						const canScrollToNewCoordinates = direction === KeyboardCode.Down && newScrollCoordinates <= maxScroll.y || direction === KeyboardCode.Up && newScrollCoordinates >= minScroll.y;
						if (canScrollToNewCoordinates && !coordinatesDelta.x) {
							scrollContainer.scrollTo({
								top: newScrollCoordinates,
								behavior: scrollBehavior
							});
							return;
						}
						if (canScrollToNewCoordinates) scrollDelta.y = scrollContainer.scrollTop - newScrollCoordinates;
						else scrollDelta.y = direction === KeyboardCode.Down ? scrollContainer.scrollTop - maxScroll.y : scrollContainer.scrollTop - minScroll.y;
						if (scrollDelta.y) scrollContainer.scrollBy({
							top: -scrollDelta.y,
							behavior: scrollBehavior
						});
						break;
					}
				}
				this.handleMove(event, add(subtract(newCoordinates, this.referenceCoordinates), scrollDelta));
			}
		}
	}
	handleMove(event, coordinates) {
		const { onMove } = this.props;
		event.preventDefault();
		onMove(coordinates);
	}
	handleEnd(event) {
		const { onEnd } = this.props;
		event.preventDefault();
		this.detach();
		onEnd();
	}
	handleCancel(event) {
		const { onCancel } = this.props;
		event.preventDefault();
		this.detach();
		onCancel();
	}
	detach() {
		this.listeners.removeAll();
		this.windowListeners.removeAll();
	}
};
KeyboardSensor.activators = [{
	eventName: "onKeyDown",
	handler: (event, _ref, _ref2) => {
		let { keyboardCodes = defaultKeyboardCodes, onActivation } = _ref;
		let { active } = _ref2;
		const { code } = event.nativeEvent;
		if (keyboardCodes.start.includes(code)) {
			const activator = active.activatorNode.current;
			if (activator && event.target !== activator) return false;
			event.preventDefault();
			onActivation?.({ event: event.nativeEvent });
			return true;
		}
		return false;
	}
}];
function isDistanceConstraint(constraint) {
	return Boolean(constraint && "distance" in constraint);
}
function isDelayConstraint(constraint) {
	return Boolean(constraint && "delay" in constraint);
}
var AbstractPointerSensor = class {
	constructor(props, events, listenerTarget) {
		var _getEventCoordinates;
		if (listenerTarget === void 0) listenerTarget = getEventListenerTarget(props.event.target);
		this.props = void 0;
		this.events = void 0;
		this.autoScrollEnabled = true;
		this.document = void 0;
		this.activated = false;
		this.initialCoordinates = void 0;
		this.timeoutId = null;
		this.listeners = void 0;
		this.documentListeners = void 0;
		this.windowListeners = void 0;
		this.props = props;
		this.events = events;
		const { event } = props;
		const { target } = event;
		this.props = props;
		this.events = events;
		this.document = getOwnerDocument(target);
		this.documentListeners = new Listeners(this.document);
		this.listeners = new Listeners(listenerTarget);
		this.windowListeners = new Listeners(getWindow(target));
		this.initialCoordinates = (_getEventCoordinates = getEventCoordinates(event)) != null ? _getEventCoordinates : defaultCoordinates;
		this.handleStart = this.handleStart.bind(this);
		this.handleMove = this.handleMove.bind(this);
		this.handleEnd = this.handleEnd.bind(this);
		this.handleCancel = this.handleCancel.bind(this);
		this.handleKeydown = this.handleKeydown.bind(this);
		this.removeTextSelection = this.removeTextSelection.bind(this);
		this.attach();
	}
	attach() {
		const { events, props: { options: { activationConstraint, bypassActivationConstraint } } } = this;
		this.listeners.add(events.move.name, this.handleMove, { passive: false });
		this.listeners.add(events.end.name, this.handleEnd);
		if (events.cancel) this.listeners.add(events.cancel.name, this.handleCancel);
		this.windowListeners.add(EventName.Resize, this.handleCancel);
		this.windowListeners.add(EventName.DragStart, preventDefault);
		this.windowListeners.add(EventName.VisibilityChange, this.handleCancel);
		this.windowListeners.add(EventName.ContextMenu, preventDefault);
		this.documentListeners.add(EventName.Keydown, this.handleKeydown);
		if (activationConstraint) {
			if (bypassActivationConstraint != null && bypassActivationConstraint({
				event: this.props.event,
				activeNode: this.props.activeNode,
				options: this.props.options
			})) return this.handleStart();
			if (isDelayConstraint(activationConstraint)) {
				this.timeoutId = setTimeout(this.handleStart, activationConstraint.delay);
				this.handlePending(activationConstraint);
				return;
			}
			if (isDistanceConstraint(activationConstraint)) {
				this.handlePending(activationConstraint);
				return;
			}
		}
		this.handleStart();
	}
	detach() {
		this.listeners.removeAll();
		this.windowListeners.removeAll();
		setTimeout(this.documentListeners.removeAll, 50);
		if (this.timeoutId !== null) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}
	handlePending(constraint, offset) {
		const { active, onPending } = this.props;
		onPending(active, constraint, this.initialCoordinates, offset);
	}
	handleStart() {
		const { initialCoordinates } = this;
		const { onStart } = this.props;
		if (initialCoordinates) {
			this.activated = true;
			this.documentListeners.add(EventName.Click, stopPropagation, { capture: true });
			this.removeTextSelection();
			this.documentListeners.add(EventName.SelectionChange, this.removeTextSelection);
			onStart(initialCoordinates);
		}
	}
	handleMove(event) {
		var _getEventCoordinates2;
		const { activated, initialCoordinates, props } = this;
		const { onMove, options: { activationConstraint } } = props;
		if (!initialCoordinates) return;
		const coordinates = (_getEventCoordinates2 = getEventCoordinates(event)) != null ? _getEventCoordinates2 : defaultCoordinates;
		const delta = subtract(initialCoordinates, coordinates);
		if (!activated && activationConstraint) {
			if (isDistanceConstraint(activationConstraint)) {
				if (activationConstraint.tolerance != null && hasExceededDistance(delta, activationConstraint.tolerance)) return this.handleCancel();
				if (hasExceededDistance(delta, activationConstraint.distance)) return this.handleStart();
			}
			if (isDelayConstraint(activationConstraint)) {
				if (hasExceededDistance(delta, activationConstraint.tolerance)) return this.handleCancel();
			}
			this.handlePending(activationConstraint, delta);
			return;
		}
		if (event.cancelable) event.preventDefault();
		onMove(coordinates);
	}
	handleEnd() {
		const { onAbort, onEnd } = this.props;
		this.detach();
		if (!this.activated) onAbort(this.props.active);
		onEnd();
	}
	handleCancel() {
		const { onAbort, onCancel } = this.props;
		this.detach();
		if (!this.activated) onAbort(this.props.active);
		onCancel();
	}
	handleKeydown(event) {
		if (event.code === KeyboardCode.Esc) this.handleCancel();
	}
	removeTextSelection() {
		var _this$document$getSel;
		(_this$document$getSel = this.document.getSelection()) == null || _this$document$getSel.removeAllRanges();
	}
};
var events = {
	cancel: { name: "pointercancel" },
	move: { name: "pointermove" },
	end: { name: "pointerup" }
};
var PointerSensor = class extends AbstractPointerSensor {
	constructor(props) {
		const { event } = props;
		const listenerTarget = getOwnerDocument(event.target);
		super(props, events, listenerTarget);
	}
};
PointerSensor.activators = [{
	eventName: "onPointerDown",
	handler: (_ref, _ref2) => {
		let { nativeEvent: event } = _ref;
		let { onActivation } = _ref2;
		if (!event.isPrimary || event.button !== 0) return false;
		onActivation?.({ event });
		return true;
	}
}];
var events$1 = {
	move: { name: "mousemove" },
	end: { name: "mouseup" }
};
var MouseButton;
(function(MouseButton) {
	MouseButton[MouseButton["RightClick"] = 2] = "RightClick";
})(MouseButton || (MouseButton = {}));
var MouseSensor = class extends AbstractPointerSensor {
	constructor(props) {
		super(props, events$1, getOwnerDocument(props.event.target));
	}
};
MouseSensor.activators = [{
	eventName: "onMouseDown",
	handler: (_ref, _ref2) => {
		let { nativeEvent: event } = _ref;
		let { onActivation } = _ref2;
		if (event.button === MouseButton.RightClick) return false;
		onActivation?.({ event });
		return true;
	}
}];
var events$2 = {
	cancel: { name: "touchcancel" },
	move: { name: "touchmove" },
	end: { name: "touchend" }
};
var TouchSensor = class extends AbstractPointerSensor {
	constructor(props) {
		super(props, events$2);
	}
	static setup() {
		window.addEventListener(events$2.move.name, noop, {
			capture: false,
			passive: false
		});
		return function teardown() {
			window.removeEventListener(events$2.move.name, noop);
		};
		function noop() {}
	}
};
TouchSensor.activators = [{
	eventName: "onTouchStart",
	handler: (_ref, _ref2) => {
		let { nativeEvent: event } = _ref;
		let { onActivation } = _ref2;
		const { touches } = event;
		if (touches.length > 1) return false;
		onActivation?.({ event });
		return true;
	}
}];
var AutoScrollActivator;
(function(AutoScrollActivator) {
	AutoScrollActivator[AutoScrollActivator["Pointer"] = 0] = "Pointer";
	AutoScrollActivator[AutoScrollActivator["DraggableRect"] = 1] = "DraggableRect";
})(AutoScrollActivator || (AutoScrollActivator = {}));
var TraversalOrder;
(function(TraversalOrder) {
	TraversalOrder[TraversalOrder["TreeOrder"] = 0] = "TreeOrder";
	TraversalOrder[TraversalOrder["ReversedTreeOrder"] = 1] = "ReversedTreeOrder";
})(TraversalOrder || (TraversalOrder = {}));
function useAutoScroller(_ref) {
	let { acceleration, activator = AutoScrollActivator.Pointer, canScroll, draggingRect, enabled, interval = 5, order = TraversalOrder.TreeOrder, pointerCoordinates, scrollableAncestors, scrollableAncestorRects, delta, threshold } = _ref;
	const scrollIntent = useScrollIntent({
		delta,
		disabled: !enabled
	});
	const [setAutoScrollInterval, clearAutoScrollInterval] = useInterval();
	const scrollSpeed = (0, import_react.useRef)({
		x: 0,
		y: 0
	});
	const scrollDirection = (0, import_react.useRef)({
		x: 0,
		y: 0
	});
	const rect = (0, import_react.useMemo)(() => {
		switch (activator) {
			case AutoScrollActivator.Pointer: return pointerCoordinates ? {
				top: pointerCoordinates.y,
				bottom: pointerCoordinates.y,
				left: pointerCoordinates.x,
				right: pointerCoordinates.x
			} : null;
			case AutoScrollActivator.DraggableRect: return draggingRect;
		}
	}, [
		activator,
		draggingRect,
		pointerCoordinates
	]);
	const scrollContainerRef = (0, import_react.useRef)(null);
	const autoScroll = (0, import_react.useCallback)(() => {
		const scrollContainer = scrollContainerRef.current;
		if (!scrollContainer) return;
		const scrollLeft = scrollSpeed.current.x * scrollDirection.current.x;
		const scrollTop = scrollSpeed.current.y * scrollDirection.current.y;
		scrollContainer.scrollBy(scrollLeft, scrollTop);
	}, []);
	const sortedScrollableAncestors = (0, import_react.useMemo)(() => order === TraversalOrder.TreeOrder ? [...scrollableAncestors].reverse() : scrollableAncestors, [order, scrollableAncestors]);
	(0, import_react.useEffect)(() => {
		if (!enabled || !scrollableAncestors.length || !rect) {
			clearAutoScrollInterval();
			return;
		}
		for (const scrollContainer of sortedScrollableAncestors) {
			if ((canScroll == null ? void 0 : canScroll(scrollContainer)) === false) continue;
			const scrollContainerRect = scrollableAncestorRects[scrollableAncestors.indexOf(scrollContainer)];
			if (!scrollContainerRect) continue;
			const { direction, speed } = getScrollDirectionAndSpeed(scrollContainer, scrollContainerRect, rect, acceleration, threshold);
			for (const axis of ["x", "y"]) if (!scrollIntent[axis][direction[axis]]) {
				speed[axis] = 0;
				direction[axis] = 0;
			}
			if (speed.x > 0 || speed.y > 0) {
				clearAutoScrollInterval();
				scrollContainerRef.current = scrollContainer;
				setAutoScrollInterval(autoScroll, interval);
				scrollSpeed.current = speed;
				scrollDirection.current = direction;
				return;
			}
		}
		scrollSpeed.current = {
			x: 0,
			y: 0
		};
		scrollDirection.current = {
			x: 0,
			y: 0
		};
		clearAutoScrollInterval();
	}, [
		acceleration,
		autoScroll,
		canScroll,
		clearAutoScrollInterval,
		enabled,
		interval,
		JSON.stringify(rect),
		JSON.stringify(scrollIntent),
		setAutoScrollInterval,
		scrollableAncestors,
		sortedScrollableAncestors,
		scrollableAncestorRects,
		JSON.stringify(threshold)
	]);
}
var defaultScrollIntent = {
	x: {
		[Direction.Backward]: false,
		[Direction.Forward]: false
	},
	y: {
		[Direction.Backward]: false,
		[Direction.Forward]: false
	}
};
function useScrollIntent(_ref2) {
	let { delta, disabled } = _ref2;
	const previousDelta = usePrevious(delta);
	return useLazyMemo((previousIntent) => {
		if (disabled || !previousDelta || !previousIntent) return defaultScrollIntent;
		const direction = {
			x: Math.sign(delta.x - previousDelta.x),
			y: Math.sign(delta.y - previousDelta.y)
		};
		return {
			x: {
				[Direction.Backward]: previousIntent.x[Direction.Backward] || direction.x === -1,
				[Direction.Forward]: previousIntent.x[Direction.Forward] || direction.x === 1
			},
			y: {
				[Direction.Backward]: previousIntent.y[Direction.Backward] || direction.y === -1,
				[Direction.Forward]: previousIntent.y[Direction.Forward] || direction.y === 1
			}
		};
	}, [
		disabled,
		delta,
		previousDelta
	]);
}
function useCachedNode(draggableNodes, id) {
	const draggableNode = id != null ? draggableNodes.get(id) : void 0;
	const node = draggableNode ? draggableNode.node.current : null;
	return useLazyMemo((cachedNode) => {
		var _ref;
		if (id == null) return null;
		return (_ref = node != null ? node : cachedNode) != null ? _ref : null;
	}, [node, id]);
}
function useCombineActivators(sensors, getSyntheticHandler) {
	return (0, import_react.useMemo)(() => sensors.reduce((accumulator, sensor) => {
		const { sensor: Sensor } = sensor;
		const sensorActivators = Sensor.activators.map((activator) => ({
			eventName: activator.eventName,
			handler: getSyntheticHandler(activator.handler, sensor)
		}));
		return [...accumulator, ...sensorActivators];
	}, []), [sensors, getSyntheticHandler]);
}
var MeasuringStrategy;
(function(MeasuringStrategy) {
	MeasuringStrategy[MeasuringStrategy["Always"] = 0] = "Always";
	MeasuringStrategy[MeasuringStrategy["BeforeDragging"] = 1] = "BeforeDragging";
	MeasuringStrategy[MeasuringStrategy["WhileDragging"] = 2] = "WhileDragging";
})(MeasuringStrategy || (MeasuringStrategy = {}));
var MeasuringFrequency;
(function(MeasuringFrequency) {
	MeasuringFrequency["Optimized"] = "optimized";
})(MeasuringFrequency || (MeasuringFrequency = {}));
var defaultValue = /*#__PURE__*/ new Map();
function useDroppableMeasuring(containers, _ref) {
	let { dragging, dependencies, config } = _ref;
	const [queue, setQueue] = (0, import_react.useState)(null);
	const { frequency, measure, strategy } = config;
	const containersRef = (0, import_react.useRef)(containers);
	const disabled = isDisabled();
	const disabledRef = useLatestValue(disabled);
	const measureDroppableContainers = (0, import_react.useCallback)(function(ids) {
		if (ids === void 0) ids = [];
		if (disabledRef.current) return;
		setQueue((value) => {
			if (value === null) return ids;
			return value.concat(ids.filter((id) => !value.includes(id)));
		});
	}, [disabledRef]);
	const timeoutId = (0, import_react.useRef)(null);
	const droppableRects = useLazyMemo((previousValue) => {
		if (disabled && !dragging) return defaultValue;
		if (!previousValue || previousValue === defaultValue || containersRef.current !== containers || queue != null) {
			const map = /* @__PURE__ */ new Map();
			for (let container of containers) {
				if (!container) continue;
				if (queue && queue.length > 0 && !queue.includes(container.id) && container.rect.current) {
					map.set(container.id, container.rect.current);
					continue;
				}
				const node = container.node.current;
				const rect = node ? new Rect(measure(node), node) : null;
				container.rect.current = rect;
				if (rect) map.set(container.id, rect);
			}
			return map;
		}
		return previousValue;
	}, [
		containers,
		queue,
		dragging,
		disabled,
		measure
	]);
	(0, import_react.useEffect)(() => {
		containersRef.current = containers;
	}, [containers]);
	(0, import_react.useEffect)(() => {
		if (disabled) return;
		measureDroppableContainers();
	}, [dragging, disabled]);
	(0, import_react.useEffect)(() => {
		if (queue && queue.length > 0) setQueue(null);
	}, [JSON.stringify(queue)]);
	(0, import_react.useEffect)(() => {
		if (disabled || typeof frequency !== "number" || timeoutId.current !== null) return;
		timeoutId.current = setTimeout(() => {
			measureDroppableContainers();
			timeoutId.current = null;
		}, frequency);
	}, [
		frequency,
		disabled,
		measureDroppableContainers,
		...dependencies
	]);
	return {
		droppableRects,
		measureDroppableContainers,
		measuringScheduled: queue != null
	};
	function isDisabled() {
		switch (strategy) {
			case MeasuringStrategy.Always: return false;
			case MeasuringStrategy.BeforeDragging: return dragging;
			default: return !dragging;
		}
	}
}
function useInitialValue(value, computeFn) {
	return useLazyMemo((previousValue) => {
		if (!value) return null;
		if (previousValue) return previousValue;
		return typeof computeFn === "function" ? computeFn(value) : value;
	}, [computeFn, value]);
}
function useInitialRect(node, measure) {
	return useInitialValue(node, measure);
}
/**
* Returns a new MutationObserver instance.
* If `MutationObserver` is undefined in the execution environment, returns `undefined`.
*/
function useMutationObserver(_ref) {
	let { callback, disabled } = _ref;
	const handleMutations = useEvent(callback);
	const mutationObserver = (0, import_react.useMemo)(() => {
		if (disabled || typeof window === "undefined" || typeof window.MutationObserver === "undefined") return;
		const { MutationObserver } = window;
		return new MutationObserver(handleMutations);
	}, [handleMutations, disabled]);
	(0, import_react.useEffect)(() => {
		return () => mutationObserver == null ? void 0 : mutationObserver.disconnect();
	}, [mutationObserver]);
	return mutationObserver;
}
/**
* Returns a new ResizeObserver instance bound to the `onResize` callback.
* If `ResizeObserver` is undefined in the execution environment, returns `undefined`.
*/
function useResizeObserver(_ref) {
	let { callback, disabled } = _ref;
	const handleResize = useEvent(callback);
	const resizeObserver = (0, import_react.useMemo)(() => {
		if (disabled || typeof window === "undefined" || typeof window.ResizeObserver === "undefined") return;
		const { ResizeObserver } = window;
		return new ResizeObserver(handleResize);
	}, [disabled]);
	(0, import_react.useEffect)(() => {
		return () => resizeObserver == null ? void 0 : resizeObserver.disconnect();
	}, [resizeObserver]);
	return resizeObserver;
}
function defaultMeasure(element) {
	return new Rect(getClientRect(element), element);
}
function useRect(element, measure, fallbackRect) {
	if (measure === void 0) measure = defaultMeasure;
	const [rect, setRect] = (0, import_react.useState)(null);
	function measureRect() {
		setRect((currentRect) => {
			if (!element) return null;
			if (element.isConnected === false) {
				var _ref;
				return (_ref = currentRect != null ? currentRect : fallbackRect) != null ? _ref : null;
			}
			const newRect = measure(element);
			if (JSON.stringify(currentRect) === JSON.stringify(newRect)) return currentRect;
			return newRect;
		});
	}
	const mutationObserver = useMutationObserver({ callback(records) {
		if (!element) return;
		for (const record of records) {
			const { type, target } = record;
			if (type === "childList" && target instanceof HTMLElement && target.contains(element)) {
				measureRect();
				break;
			}
		}
	} });
	const resizeObserver = useResizeObserver({ callback: measureRect });
	useIsomorphicLayoutEffect(() => {
		measureRect();
		if (element) {
			resizeObserver?.observe(element);
			mutationObserver?.observe(document.body, {
				childList: true,
				subtree: true
			});
		} else {
			resizeObserver?.disconnect();
			mutationObserver?.disconnect();
		}
	}, [element]);
	return rect;
}
function useRectDelta(rect) {
	return getRectDelta(rect, useInitialValue(rect));
}
var defaultValue$1 = [];
function useScrollableAncestors(node) {
	const previousNode = (0, import_react.useRef)(node);
	const ancestors = useLazyMemo((previousValue) => {
		if (!node) return defaultValue$1;
		if (previousValue && previousValue !== defaultValue$1 && node && previousNode.current && node.parentNode === previousNode.current.parentNode) return previousValue;
		return getScrollableAncestors(node);
	}, [node]);
	(0, import_react.useEffect)(() => {
		previousNode.current = node;
	}, [node]);
	return ancestors;
}
function useScrollOffsets(elements) {
	const [scrollCoordinates, setScrollCoordinates] = (0, import_react.useState)(null);
	const prevElements = (0, import_react.useRef)(elements);
	const handleScroll = (0, import_react.useCallback)((event) => {
		const scrollingElement = getScrollableElement(event.target);
		if (!scrollingElement) return;
		setScrollCoordinates((scrollCoordinates) => {
			if (!scrollCoordinates) return null;
			scrollCoordinates.set(scrollingElement, getScrollCoordinates(scrollingElement));
			return new Map(scrollCoordinates);
		});
	}, []);
	(0, import_react.useEffect)(() => {
		const previousElements = prevElements.current;
		if (elements !== previousElements) {
			cleanup(previousElements);
			const entries = elements.map((element) => {
				const scrollableElement = getScrollableElement(element);
				if (scrollableElement) {
					scrollableElement.addEventListener("scroll", handleScroll, { passive: true });
					return [scrollableElement, getScrollCoordinates(scrollableElement)];
				}
				return null;
			}).filter((entry) => entry != null);
			setScrollCoordinates(entries.length ? new Map(entries) : null);
			prevElements.current = elements;
		}
		return () => {
			cleanup(elements);
			cleanup(previousElements);
		};
		function cleanup(elements) {
			elements.forEach((element) => {
				getScrollableElement(element)?.removeEventListener("scroll", handleScroll);
			});
		}
	}, [handleScroll, elements]);
	return (0, import_react.useMemo)(() => {
		if (elements.length) return scrollCoordinates ? Array.from(scrollCoordinates.values()).reduce((acc, coordinates) => add(acc, coordinates), defaultCoordinates) : getScrollOffsets(elements);
		return defaultCoordinates;
	}, [elements, scrollCoordinates]);
}
function useScrollOffsetsDelta(scrollOffsets, dependencies) {
	if (dependencies === void 0) dependencies = [];
	const initialScrollOffsets = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		initialScrollOffsets.current = null;
	}, dependencies);
	(0, import_react.useEffect)(() => {
		const hasScrollOffsets = scrollOffsets !== defaultCoordinates;
		if (hasScrollOffsets && !initialScrollOffsets.current) initialScrollOffsets.current = scrollOffsets;
		if (!hasScrollOffsets && initialScrollOffsets.current) initialScrollOffsets.current = null;
	}, [scrollOffsets]);
	return initialScrollOffsets.current ? subtract(scrollOffsets, initialScrollOffsets.current) : defaultCoordinates;
}
function useSensorSetup(sensors) {
	(0, import_react.useEffect)(() => {
		if (!canUseDOM) return;
		const teardownFns = sensors.map((_ref) => {
			let { sensor } = _ref;
			return sensor.setup == null ? void 0 : sensor.setup();
		});
		return () => {
			for (const teardown of teardownFns) teardown?.();
		};
	}, sensors.map((_ref2) => {
		let { sensor } = _ref2;
		return sensor;
	}));
}
function useSyntheticListeners(listeners, id) {
	return (0, import_react.useMemo)(() => {
		return listeners.reduce((acc, _ref) => {
			let { eventName, handler } = _ref;
			acc[eventName] = (event) => {
				handler(event, id);
			};
			return acc;
		}, {});
	}, [listeners, id]);
}
function useWindowRect(element) {
	return (0, import_react.useMemo)(() => element ? getWindowClientRect(element) : null, [element]);
}
var defaultValue$2 = [];
function useRects(elements, measure) {
	if (measure === void 0) measure = getClientRect;
	const [firstElement] = elements;
	const windowRect = useWindowRect(firstElement ? getWindow(firstElement) : null);
	const [rects, setRects] = (0, import_react.useState)(defaultValue$2);
	function measureRects() {
		setRects(() => {
			if (!elements.length) return defaultValue$2;
			return elements.map((element) => isDocumentScrollingElement(element) ? windowRect : new Rect(measure(element), element));
		});
	}
	const resizeObserver = useResizeObserver({ callback: measureRects });
	useIsomorphicLayoutEffect(() => {
		resizeObserver?.disconnect();
		measureRects();
		elements.forEach((element) => resizeObserver == null ? void 0 : resizeObserver.observe(element));
	}, [elements]);
	return rects;
}
function getMeasurableNode(node) {
	if (!node) return null;
	if (node.children.length > 1) return node;
	const firstChild = node.children[0];
	return isHTMLElement(firstChild) ? firstChild : node;
}
function useDragOverlayMeasuring(_ref) {
	let { measure } = _ref;
	const [rect, setRect] = (0, import_react.useState)(null);
	const resizeObserver = useResizeObserver({ callback: (0, import_react.useCallback)((entries) => {
		for (const { target } of entries) if (isHTMLElement(target)) {
			setRect((rect) => {
				const newRect = measure(target);
				return rect ? {
					...rect,
					width: newRect.width,
					height: newRect.height
				} : newRect;
			});
			break;
		}
	}, [measure]) });
	const [nodeRef, setRef] = useNodeRef((0, import_react.useCallback)((element) => {
		const node = getMeasurableNode(element);
		resizeObserver?.disconnect();
		if (node) resizeObserver?.observe(node);
		setRect(node ? measure(node) : null);
	}, [measure, resizeObserver]));
	return (0, import_react.useMemo)(() => ({
		nodeRef,
		rect,
		setRef
	}), [
		rect,
		nodeRef,
		setRef
	]);
}
var defaultSensors = [{
	sensor: PointerSensor,
	options: {}
}, {
	sensor: KeyboardSensor,
	options: {}
}];
var defaultData = { current: {} };
var defaultMeasuringConfiguration = {
	draggable: { measure: getTransformAgnosticClientRect },
	droppable: {
		measure: getTransformAgnosticClientRect,
		strategy: MeasuringStrategy.WhileDragging,
		frequency: MeasuringFrequency.Optimized
	},
	dragOverlay: { measure: getClientRect }
};
var DroppableContainersMap = class extends Map {
	get(id) {
		var _super$get;
		return id != null ? (_super$get = super.get(id)) != null ? _super$get : void 0 : void 0;
	}
	toArray() {
		return Array.from(this.values());
	}
	getEnabled() {
		return this.toArray().filter((_ref) => {
			let { disabled } = _ref;
			return !disabled;
		});
	}
	getNodeFor(id) {
		var _this$get$node$curren, _this$get;
		return (_this$get$node$curren = (_this$get = this.get(id)) == null ? void 0 : _this$get.node.current) != null ? _this$get$node$curren : void 0;
	}
};
var defaultPublicContext = {
	activatorEvent: null,
	active: null,
	activeNode: null,
	activeNodeRect: null,
	collisions: null,
	containerNodeRect: null,
	draggableNodes: /*#__PURE__*/ new Map(),
	droppableRects: /*#__PURE__*/ new Map(),
	droppableContainers: /*#__PURE__*/ new DroppableContainersMap(),
	over: null,
	dragOverlay: {
		nodeRef: { current: null },
		rect: null,
		setRef: noop
	},
	scrollableAncestors: [],
	scrollableAncestorRects: [],
	measuringConfiguration: defaultMeasuringConfiguration,
	measureDroppableContainers: noop,
	windowRect: null,
	measuringScheduled: false
};
var defaultInternalContext = {
	activatorEvent: null,
	activators: [],
	active: null,
	activeNodeRect: null,
	ariaDescribedById: { draggable: "" },
	dispatch: noop,
	draggableNodes: /*#__PURE__*/ new Map(),
	over: null,
	measureDroppableContainers: noop
};
var InternalContext = /*#__PURE__*/ (0, import_react.createContext)(defaultInternalContext);
var PublicContext = /*#__PURE__*/ (0, import_react.createContext)(defaultPublicContext);
function getInitialState() {
	return {
		draggable: {
			active: null,
			initialCoordinates: {
				x: 0,
				y: 0
			},
			nodes: /* @__PURE__ */ new Map(),
			translate: {
				x: 0,
				y: 0
			}
		},
		droppable: { containers: new DroppableContainersMap() }
	};
}
function reducer(state, action) {
	switch (action.type) {
		case Action.DragStart: return {
			...state,
			draggable: {
				...state.draggable,
				initialCoordinates: action.initialCoordinates,
				active: action.active
			}
		};
		case Action.DragMove:
			if (state.draggable.active == null) return state;
			return {
				...state,
				draggable: {
					...state.draggable,
					translate: {
						x: action.coordinates.x - state.draggable.initialCoordinates.x,
						y: action.coordinates.y - state.draggable.initialCoordinates.y
					}
				}
			};
		case Action.DragEnd:
		case Action.DragCancel: return {
			...state,
			draggable: {
				...state.draggable,
				active: null,
				initialCoordinates: {
					x: 0,
					y: 0
				},
				translate: {
					x: 0,
					y: 0
				}
			}
		};
		case Action.RegisterDroppable: {
			const { element } = action;
			const { id } = element;
			const containers = new DroppableContainersMap(state.droppable.containers);
			containers.set(id, element);
			return {
				...state,
				droppable: {
					...state.droppable,
					containers
				}
			};
		}
		case Action.SetDroppableDisabled: {
			const { id, key, disabled } = action;
			const element = state.droppable.containers.get(id);
			if (!element || key !== element.key) return state;
			const containers = new DroppableContainersMap(state.droppable.containers);
			containers.set(id, {
				...element,
				disabled
			});
			return {
				...state,
				droppable: {
					...state.droppable,
					containers
				}
			};
		}
		case Action.UnregisterDroppable: {
			const { id, key } = action;
			const element = state.droppable.containers.get(id);
			if (!element || key !== element.key) return state;
			const containers = new DroppableContainersMap(state.droppable.containers);
			containers.delete(id);
			return {
				...state,
				droppable: {
					...state.droppable,
					containers
				}
			};
		}
		default: return state;
	}
}
function RestoreFocus(_ref) {
	let { disabled } = _ref;
	const { active, activatorEvent, draggableNodes } = (0, import_react.useContext)(InternalContext);
	const previousActivatorEvent = usePrevious(activatorEvent);
	const previousActiveId = usePrevious(active == null ? void 0 : active.id);
	(0, import_react.useEffect)(() => {
		if (disabled) return;
		if (!activatorEvent && previousActivatorEvent && previousActiveId != null) {
			if (!isKeyboardEvent(previousActivatorEvent)) return;
			if (document.activeElement === previousActivatorEvent.target) return;
			const draggableNode = draggableNodes.get(previousActiveId);
			if (!draggableNode) return;
			const { activatorNode, node } = draggableNode;
			if (!activatorNode.current && !node.current) return;
			requestAnimationFrame(() => {
				for (const element of [activatorNode.current, node.current]) {
					if (!element) continue;
					const focusableNode = findFirstFocusableNode(element);
					if (focusableNode) {
						focusableNode.focus();
						break;
					}
				}
			});
		}
	}, [
		activatorEvent,
		disabled,
		draggableNodes,
		previousActiveId,
		previousActivatorEvent
	]);
	return null;
}
function applyModifiers(modifiers, _ref) {
	let { transform, ...args } = _ref;
	return modifiers != null && modifiers.length ? modifiers.reduce((accumulator, modifier) => {
		return modifier({
			transform: accumulator,
			...args
		});
	}, transform) : transform;
}
function useMeasuringConfiguration(config) {
	return (0, import_react.useMemo)(() => ({
		draggable: {
			...defaultMeasuringConfiguration.draggable,
			...config == null ? void 0 : config.draggable
		},
		droppable: {
			...defaultMeasuringConfiguration.droppable,
			...config == null ? void 0 : config.droppable
		},
		dragOverlay: {
			...defaultMeasuringConfiguration.dragOverlay,
			...config == null ? void 0 : config.dragOverlay
		}
	}), [
		config == null ? void 0 : config.draggable,
		config == null ? void 0 : config.droppable,
		config == null ? void 0 : config.dragOverlay
	]);
}
function useLayoutShiftScrollCompensation(_ref) {
	let { activeNode, measure, initialRect, config = true } = _ref;
	const initialized = (0, import_react.useRef)(false);
	const { x, y } = typeof config === "boolean" ? {
		x: config,
		y: config
	} : config;
	useIsomorphicLayoutEffect(() => {
		if (!x && !y || !activeNode) {
			initialized.current = false;
			return;
		}
		if (initialized.current || !initialRect) return;
		const node = activeNode == null ? void 0 : activeNode.node.current;
		if (!node || node.isConnected === false) return;
		const rectDelta = getRectDelta(measure(node), initialRect);
		if (!x) rectDelta.x = 0;
		if (!y) rectDelta.y = 0;
		initialized.current = true;
		if (Math.abs(rectDelta.x) > 0 || Math.abs(rectDelta.y) > 0) {
			const firstScrollableAncestor = getFirstScrollableAncestor(node);
			if (firstScrollableAncestor) firstScrollableAncestor.scrollBy({
				top: rectDelta.y,
				left: rectDelta.x
			});
		}
	}, [
		activeNode,
		x,
		y,
		initialRect,
		measure
	]);
}
var ActiveDraggableContext = /*#__PURE__*/ (0, import_react.createContext)({
	...defaultCoordinates,
	scaleX: 1,
	scaleY: 1
});
var Status;
(function(Status) {
	Status[Status["Uninitialized"] = 0] = "Uninitialized";
	Status[Status["Initializing"] = 1] = "Initializing";
	Status[Status["Initialized"] = 2] = "Initialized";
})(Status || (Status = {}));
var DndContext = /*#__PURE__*/ (0, import_react.memo)(function DndContext(_ref) {
	var _sensorContext$curren, _dragOverlay$nodeRef$, _dragOverlay$rect, _over$rect;
	let { id, accessibility, autoScroll = true, children, sensors = defaultSensors, collisionDetection = rectIntersection, measuring, modifiers, ...props } = _ref;
	const [state, dispatch] = (0, import_react.useReducer)(reducer, void 0, getInitialState);
	const [dispatchMonitorEvent, registerMonitorListener] = useDndMonitorProvider();
	const [status, setStatus] = (0, import_react.useState)(Status.Uninitialized);
	const isInitialized = status === Status.Initialized;
	const { draggable: { active: activeId, nodes: draggableNodes, translate }, droppable: { containers: droppableContainers } } = state;
	const node = activeId != null ? draggableNodes.get(activeId) : null;
	const activeRects = (0, import_react.useRef)({
		initial: null,
		translated: null
	});
	const active = (0, import_react.useMemo)(() => {
		var _node$data;
		return activeId != null ? {
			id: activeId,
			data: (_node$data = node == null ? void 0 : node.data) != null ? _node$data : defaultData,
			rect: activeRects
		} : null;
	}, [activeId, node]);
	const activeRef = (0, import_react.useRef)(null);
	const [activeSensor, setActiveSensor] = (0, import_react.useState)(null);
	const [activatorEvent, setActivatorEvent] = (0, import_react.useState)(null);
	const latestProps = useLatestValue(props, Object.values(props));
	const draggableDescribedById = useUniqueId("DndDescribedBy", id);
	const enabledDroppableContainers = (0, import_react.useMemo)(() => droppableContainers.getEnabled(), [droppableContainers]);
	const measuringConfiguration = useMeasuringConfiguration(measuring);
	const { droppableRects, measureDroppableContainers, measuringScheduled } = useDroppableMeasuring(enabledDroppableContainers, {
		dragging: isInitialized,
		dependencies: [translate.x, translate.y],
		config: measuringConfiguration.droppable
	});
	const activeNode = useCachedNode(draggableNodes, activeId);
	const activationCoordinates = (0, import_react.useMemo)(() => activatorEvent ? getEventCoordinates(activatorEvent) : null, [activatorEvent]);
	const autoScrollOptions = getAutoScrollerOptions();
	const initialActiveNodeRect = useInitialRect(activeNode, measuringConfiguration.draggable.measure);
	useLayoutShiftScrollCompensation({
		activeNode: activeId != null ? draggableNodes.get(activeId) : null,
		config: autoScrollOptions.layoutShiftCompensation,
		initialRect: initialActiveNodeRect,
		measure: measuringConfiguration.draggable.measure
	});
	const activeNodeRect = useRect(activeNode, measuringConfiguration.draggable.measure, initialActiveNodeRect);
	const containerNodeRect = useRect(activeNode ? activeNode.parentElement : null);
	const sensorContext = (0, import_react.useRef)({
		activatorEvent: null,
		active: null,
		activeNode,
		collisionRect: null,
		collisions: null,
		droppableRects,
		draggableNodes,
		draggingNode: null,
		draggingNodeRect: null,
		droppableContainers,
		over: null,
		scrollableAncestors: [],
		scrollAdjustedTranslate: null
	});
	const overNode = droppableContainers.getNodeFor((_sensorContext$curren = sensorContext.current.over) == null ? void 0 : _sensorContext$curren.id);
	const dragOverlay = useDragOverlayMeasuring({ measure: measuringConfiguration.dragOverlay.measure });
	const draggingNode = (_dragOverlay$nodeRef$ = dragOverlay.nodeRef.current) != null ? _dragOverlay$nodeRef$ : activeNode;
	const draggingNodeRect = isInitialized ? (_dragOverlay$rect = dragOverlay.rect) != null ? _dragOverlay$rect : activeNodeRect : null;
	const usesDragOverlay = Boolean(dragOverlay.nodeRef.current && dragOverlay.rect);
	const nodeRectDelta = useRectDelta(usesDragOverlay ? null : activeNodeRect);
	const windowRect = useWindowRect(draggingNode ? getWindow(draggingNode) : null);
	const scrollableAncestors = useScrollableAncestors(isInitialized ? overNode != null ? overNode : activeNode : null);
	const scrollableAncestorRects = useRects(scrollableAncestors);
	const modifiedTranslate = applyModifiers(modifiers, {
		transform: {
			x: translate.x - nodeRectDelta.x,
			y: translate.y - nodeRectDelta.y,
			scaleX: 1,
			scaleY: 1
		},
		activatorEvent,
		active,
		activeNodeRect,
		containerNodeRect,
		draggingNodeRect,
		over: sensorContext.current.over,
		overlayNodeRect: dragOverlay.rect,
		scrollableAncestors,
		scrollableAncestorRects,
		windowRect
	});
	const pointerCoordinates = activationCoordinates ? add(activationCoordinates, translate) : null;
	const scrollOffsets = useScrollOffsets(scrollableAncestors);
	const scrollAdjustment = useScrollOffsetsDelta(scrollOffsets);
	const activeNodeScrollDelta = useScrollOffsetsDelta(scrollOffsets, [activeNodeRect]);
	const scrollAdjustedTranslate = add(modifiedTranslate, scrollAdjustment);
	const collisionRect = draggingNodeRect ? getAdjustedRect(draggingNodeRect, modifiedTranslate) : null;
	const collisions = active && collisionRect ? collisionDetection({
		active,
		collisionRect,
		droppableRects,
		droppableContainers: enabledDroppableContainers,
		pointerCoordinates
	}) : null;
	const overId = getFirstCollision(collisions, "id");
	const [over, setOver] = (0, import_react.useState)(null);
	const transform = adjustScale(usesDragOverlay ? modifiedTranslate : add(modifiedTranslate, activeNodeScrollDelta), (_over$rect = over == null ? void 0 : over.rect) != null ? _over$rect : null, activeNodeRect);
	const activeSensorRef = (0, import_react.useRef)(null);
	const instantiateSensor = (0, import_react.useCallback)((event, _ref2) => {
		let { sensor: Sensor, options } = _ref2;
		if (activeRef.current == null) return;
		const activeNode = draggableNodes.get(activeRef.current);
		if (!activeNode) return;
		const activatorEvent = event.nativeEvent;
		activeSensorRef.current = new Sensor({
			active: activeRef.current,
			activeNode,
			event: activatorEvent,
			options,
			context: sensorContext,
			onAbort(id) {
				if (!draggableNodes.get(id)) return;
				const { onDragAbort } = latestProps.current;
				const event = { id };
				onDragAbort?.(event);
				dispatchMonitorEvent({
					type: "onDragAbort",
					event
				});
			},
			onPending(id, constraint, initialCoordinates, offset) {
				if (!draggableNodes.get(id)) return;
				const { onDragPending } = latestProps.current;
				const event = {
					id,
					constraint,
					initialCoordinates,
					offset
				};
				onDragPending?.(event);
				dispatchMonitorEvent({
					type: "onDragPending",
					event
				});
			},
			onStart(initialCoordinates) {
				const id = activeRef.current;
				if (id == null) return;
				const draggableNode = draggableNodes.get(id);
				if (!draggableNode) return;
				const { onDragStart } = latestProps.current;
				const event = {
					activatorEvent,
					active: {
						id,
						data: draggableNode.data,
						rect: activeRects
					}
				};
				(0, import_react_dom.unstable_batchedUpdates)(() => {
					onDragStart?.(event);
					setStatus(Status.Initializing);
					dispatch({
						type: Action.DragStart,
						initialCoordinates,
						active: id
					});
					dispatchMonitorEvent({
						type: "onDragStart",
						event
					});
					setActiveSensor(activeSensorRef.current);
					setActivatorEvent(activatorEvent);
				});
			},
			onMove(coordinates) {
				dispatch({
					type: Action.DragMove,
					coordinates
				});
			},
			onEnd: createHandler(Action.DragEnd),
			onCancel: createHandler(Action.DragCancel)
		});
		function createHandler(type) {
			return async function handler() {
				const { active, collisions, over, scrollAdjustedTranslate } = sensorContext.current;
				let event = null;
				if (active && scrollAdjustedTranslate) {
					const { cancelDrop } = latestProps.current;
					event = {
						activatorEvent,
						active,
						collisions,
						delta: scrollAdjustedTranslate,
						over
					};
					if (type === Action.DragEnd && typeof cancelDrop === "function") {
						if (await Promise.resolve(cancelDrop(event))) type = Action.DragCancel;
					}
				}
				activeRef.current = null;
				(0, import_react_dom.unstable_batchedUpdates)(() => {
					dispatch({ type });
					setStatus(Status.Uninitialized);
					setOver(null);
					setActiveSensor(null);
					setActivatorEvent(null);
					activeSensorRef.current = null;
					const eventName = type === Action.DragEnd ? "onDragEnd" : "onDragCancel";
					if (event) {
						const handler = latestProps.current[eventName];
						handler?.(event);
						dispatchMonitorEvent({
							type: eventName,
							event
						});
					}
				});
			};
		}
	}, [draggableNodes]);
	const activators = useCombineActivators(sensors, (0, import_react.useCallback)((handler, sensor) => {
		return (event, active) => {
			const nativeEvent = event.nativeEvent;
			const activeDraggableNode = draggableNodes.get(active);
			if (activeRef.current !== null || !activeDraggableNode || nativeEvent.dndKit || nativeEvent.defaultPrevented) return;
			const activationContext = { active: activeDraggableNode };
			if (handler(event, sensor.options, activationContext) === true) {
				nativeEvent.dndKit = { capturedBy: sensor.sensor };
				activeRef.current = active;
				instantiateSensor(event, sensor);
			}
		};
	}, [draggableNodes, instantiateSensor]));
	useSensorSetup(sensors);
	useIsomorphicLayoutEffect(() => {
		if (activeNodeRect && status === Status.Initializing) setStatus(Status.Initialized);
	}, [activeNodeRect, status]);
	(0, import_react.useEffect)(() => {
		const { onDragMove } = latestProps.current;
		const { active, activatorEvent, collisions, over } = sensorContext.current;
		if (!active || !activatorEvent) return;
		const event = {
			active,
			activatorEvent,
			collisions,
			delta: {
				x: scrollAdjustedTranslate.x,
				y: scrollAdjustedTranslate.y
			},
			over
		};
		(0, import_react_dom.unstable_batchedUpdates)(() => {
			onDragMove?.(event);
			dispatchMonitorEvent({
				type: "onDragMove",
				event
			});
		});
	}, [scrollAdjustedTranslate.x, scrollAdjustedTranslate.y]);
	(0, import_react.useEffect)(() => {
		const { active, activatorEvent, collisions, droppableContainers, scrollAdjustedTranslate } = sensorContext.current;
		if (!active || activeRef.current == null || !activatorEvent || !scrollAdjustedTranslate) return;
		const { onDragOver } = latestProps.current;
		const overContainer = droppableContainers.get(overId);
		const over = overContainer && overContainer.rect.current ? {
			id: overContainer.id,
			rect: overContainer.rect.current,
			data: overContainer.data,
			disabled: overContainer.disabled
		} : null;
		const event = {
			active,
			activatorEvent,
			collisions,
			delta: {
				x: scrollAdjustedTranslate.x,
				y: scrollAdjustedTranslate.y
			},
			over
		};
		(0, import_react_dom.unstable_batchedUpdates)(() => {
			setOver(over);
			onDragOver?.(event);
			dispatchMonitorEvent({
				type: "onDragOver",
				event
			});
		});
	}, [overId]);
	useIsomorphicLayoutEffect(() => {
		sensorContext.current = {
			activatorEvent,
			active,
			activeNode,
			collisionRect,
			collisions,
			droppableRects,
			draggableNodes,
			draggingNode,
			draggingNodeRect,
			droppableContainers,
			over,
			scrollableAncestors,
			scrollAdjustedTranslate
		};
		activeRects.current = {
			initial: draggingNodeRect,
			translated: collisionRect
		};
	}, [
		active,
		activeNode,
		collisions,
		collisionRect,
		draggableNodes,
		draggingNode,
		draggingNodeRect,
		droppableRects,
		droppableContainers,
		over,
		scrollableAncestors,
		scrollAdjustedTranslate
	]);
	useAutoScroller({
		...autoScrollOptions,
		delta: translate,
		draggingRect: collisionRect,
		pointerCoordinates,
		scrollableAncestors,
		scrollableAncestorRects
	});
	const publicContext = (0, import_react.useMemo)(() => {
		return {
			active,
			activeNode,
			activeNodeRect,
			activatorEvent,
			collisions,
			containerNodeRect,
			dragOverlay,
			draggableNodes,
			droppableContainers,
			droppableRects,
			over,
			measureDroppableContainers,
			scrollableAncestors,
			scrollableAncestorRects,
			measuringConfiguration,
			measuringScheduled,
			windowRect
		};
	}, [
		active,
		activeNode,
		activeNodeRect,
		activatorEvent,
		collisions,
		containerNodeRect,
		dragOverlay,
		draggableNodes,
		droppableContainers,
		droppableRects,
		over,
		measureDroppableContainers,
		scrollableAncestors,
		scrollableAncestorRects,
		measuringConfiguration,
		measuringScheduled,
		windowRect
	]);
	const internalContext = (0, import_react.useMemo)(() => {
		return {
			activatorEvent,
			activators,
			active,
			activeNodeRect,
			ariaDescribedById: { draggable: draggableDescribedById },
			dispatch,
			draggableNodes,
			over,
			measureDroppableContainers
		};
	}, [
		activatorEvent,
		activators,
		active,
		activeNodeRect,
		dispatch,
		draggableDescribedById,
		draggableNodes,
		over,
		measureDroppableContainers
	]);
	return import_react.createElement(DndMonitorContext.Provider, { value: registerMonitorListener }, import_react.createElement(InternalContext.Provider, { value: internalContext }, import_react.createElement(PublicContext.Provider, { value: publicContext }, import_react.createElement(ActiveDraggableContext.Provider, { value: transform }, children)), import_react.createElement(RestoreFocus, { disabled: (accessibility == null ? void 0 : accessibility.restoreFocus) === false })), import_react.createElement(Accessibility, {
		...accessibility,
		hiddenTextDescribedById: draggableDescribedById
	}));
	function getAutoScrollerOptions() {
		const activeSensorDisablesAutoscroll = (activeSensor == null ? void 0 : activeSensor.autoScrollEnabled) === false;
		const autoScrollGloballyDisabled = typeof autoScroll === "object" ? autoScroll.enabled === false : autoScroll === false;
		const enabled = isInitialized && !activeSensorDisablesAutoscroll && !autoScrollGloballyDisabled;
		if (typeof autoScroll === "object") return {
			...autoScroll,
			enabled
		};
		return { enabled };
	}
});
var NullContext = /*#__PURE__*/ (0, import_react.createContext)(null);
var defaultRole = "button";
var ID_PREFIX = "Draggable";
function useDraggable(_ref) {
	let { id, data, disabled = false, attributes } = _ref;
	const key = useUniqueId(ID_PREFIX);
	const { activators, activatorEvent, active, activeNodeRect, ariaDescribedById, draggableNodes, over } = (0, import_react.useContext)(InternalContext);
	const { role = defaultRole, roleDescription = "draggable", tabIndex = 0 } = attributes != null ? attributes : {};
	const isDragging = (active == null ? void 0 : active.id) === id;
	const transform = (0, import_react.useContext)(isDragging ? ActiveDraggableContext : NullContext);
	const [node, setNodeRef] = useNodeRef();
	const [activatorNode, setActivatorNodeRef] = useNodeRef();
	const listeners = useSyntheticListeners(activators, id);
	const dataRef = useLatestValue(data);
	useIsomorphicLayoutEffect(() => {
		draggableNodes.set(id, {
			id,
			key,
			node,
			activatorNode,
			data: dataRef
		});
		return () => {
			const node = draggableNodes.get(id);
			if (node && node.key === key) draggableNodes.delete(id);
		};
	}, [draggableNodes, id]);
	return {
		active,
		activatorEvent,
		activeNodeRect,
		attributes: (0, import_react.useMemo)(() => ({
			role,
			tabIndex,
			"aria-disabled": disabled,
			"aria-pressed": isDragging && role === defaultRole ? true : void 0,
			"aria-roledescription": roleDescription,
			"aria-describedby": ariaDescribedById.draggable
		}), [
			disabled,
			role,
			tabIndex,
			isDragging,
			roleDescription,
			ariaDescribedById.draggable
		]),
		isDragging,
		listeners: disabled ? void 0 : listeners,
		node,
		over,
		setNodeRef,
		setActivatorNodeRef,
		transform
	};
}
function useDndContext() {
	return (0, import_react.useContext)(PublicContext);
}
var ID_PREFIX$1 = "Droppable";
var defaultResizeObserverConfig = { timeout: 25 };
function useDroppable(_ref) {
	let { data, disabled = false, id, resizeObserverConfig } = _ref;
	const key = useUniqueId(ID_PREFIX$1);
	const { active, dispatch, over, measureDroppableContainers } = (0, import_react.useContext)(InternalContext);
	const previous = (0, import_react.useRef)({ disabled });
	const resizeObserverConnected = (0, import_react.useRef)(false);
	const rect = (0, import_react.useRef)(null);
	const callbackId = (0, import_react.useRef)(null);
	const { disabled: resizeObserverDisabled, updateMeasurementsFor, timeout: resizeObserverTimeout } = {
		...defaultResizeObserverConfig,
		...resizeObserverConfig
	};
	const ids = useLatestValue(updateMeasurementsFor != null ? updateMeasurementsFor : id);
	const resizeObserver = useResizeObserver({
		callback: (0, import_react.useCallback)(() => {
			if (!resizeObserverConnected.current) {
				resizeObserverConnected.current = true;
				return;
			}
			if (callbackId.current != null) clearTimeout(callbackId.current);
			callbackId.current = setTimeout(() => {
				measureDroppableContainers(Array.isArray(ids.current) ? ids.current : [ids.current]);
				callbackId.current = null;
			}, resizeObserverTimeout);
		}, [resizeObserverTimeout]),
		disabled: resizeObserverDisabled || !active
	});
	const [nodeRef, setNodeRef] = useNodeRef((0, import_react.useCallback)((newElement, previousElement) => {
		if (!resizeObserver) return;
		if (previousElement) {
			resizeObserver.unobserve(previousElement);
			resizeObserverConnected.current = false;
		}
		if (newElement) resizeObserver.observe(newElement);
	}, [resizeObserver]));
	const dataRef = useLatestValue(data);
	(0, import_react.useEffect)(() => {
		if (!resizeObserver || !nodeRef.current) return;
		resizeObserver.disconnect();
		resizeObserverConnected.current = false;
		resizeObserver.observe(nodeRef.current);
	}, [nodeRef, resizeObserver]);
	(0, import_react.useEffect)(() => {
		dispatch({
			type: Action.RegisterDroppable,
			element: {
				id,
				key,
				disabled,
				node: nodeRef,
				rect,
				data: dataRef
			}
		});
		return () => dispatch({
			type: Action.UnregisterDroppable,
			key,
			id
		});
	}, [id]);
	(0, import_react.useEffect)(() => {
		if (disabled !== previous.current.disabled) {
			dispatch({
				type: Action.SetDroppableDisabled,
				id,
				key,
				disabled
			});
			previous.current.disabled = disabled;
		}
	}, [
		id,
		key,
		disabled,
		dispatch
	]);
	return {
		active,
		rect,
		isOver: (over == null ? void 0 : over.id) === id,
		node: nodeRef,
		over,
		setNodeRef
	};
}
//#endregion
export { require_react_dom as _, closestCenter as a, useDraggable as c, useSensors as d, CSS as f, useUniqueId as g, useIsomorphicLayoutEffect as h, TouchSensor as i, useDroppable as l, useCombinedRefs as m, KeyboardCode as n, getClientRect as o, isKeyboardEvent as p, PointerSensor as r, useDndContext as s, DndContext as t, useSensor as u };
