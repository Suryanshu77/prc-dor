import { i as __toESM } from "../_runtime.mjs";
import { i as require_react } from "./dnd-kit__accessibility+react.mjs";
import { c as useDraggable, f as CSS, g as useUniqueId, h as useIsomorphicLayoutEffect, l as useDroppable, m as useCombinedRefs, n as KeyboardCode, o as getClientRect, p as isKeyboardEvent, s as useDndContext } from "./@dnd-kit/core+[...].mjs";
//#region node_modules/@dnd-kit/sortable/dist/sortable.esm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
/**
* Move an array item to a different position. Returns a new array with the item moved to the new position.
*/
function arrayMove(array, from, to) {
	const newArray = array.slice();
	newArray.splice(to < 0 ? newArray.length + to : to, 0, newArray.splice(from, 1)[0]);
	return newArray;
}
function getSortedRects(items, rects) {
	return items.reduce((accumulator, id, index) => {
		const rect = rects.get(id);
		if (rect) accumulator[index] = rect;
		return accumulator;
	}, Array(items.length));
}
function isValidIndex(index) {
	return index !== null && index >= 0;
}
function itemsEqual(a, b) {
	if (a === b) return true;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}
function normalizeDisabled(disabled) {
	if (typeof disabled === "boolean") return {
		draggable: disabled,
		droppable: disabled
	};
	return disabled;
}
var rectSortingStrategy = (_ref) => {
	let { rects, activeIndex, overIndex, index } = _ref;
	const newRects = arrayMove(rects, overIndex, activeIndex);
	const oldRect = rects[index];
	const newRect = newRects[index];
	if (!newRect || !oldRect) return null;
	return {
		x: newRect.left - oldRect.left,
		y: newRect.top - oldRect.top,
		scaleX: newRect.width / oldRect.width,
		scaleY: newRect.height / oldRect.height
	};
};
var defaultScale$1 = {
	scaleX: 1,
	scaleY: 1
};
var verticalListSortingStrategy = (_ref) => {
	var _rects$activeIndex;
	let { activeIndex, activeNodeRect: fallbackActiveRect, index, rects, overIndex } = _ref;
	const activeNodeRect = (_rects$activeIndex = rects[activeIndex]) != null ? _rects$activeIndex : fallbackActiveRect;
	if (!activeNodeRect) return null;
	if (index === activeIndex) {
		const overIndexRect = rects[overIndex];
		if (!overIndexRect) return null;
		return {
			x: 0,
			y: activeIndex < overIndex ? overIndexRect.top + overIndexRect.height - (activeNodeRect.top + activeNodeRect.height) : overIndexRect.top - activeNodeRect.top,
			...defaultScale$1
		};
	}
	const itemGap = getItemGap$1(rects, index, activeIndex);
	if (index > activeIndex && index <= overIndex) return {
		x: 0,
		y: -activeNodeRect.height - itemGap,
		...defaultScale$1
	};
	if (index < activeIndex && index >= overIndex) return {
		x: 0,
		y: activeNodeRect.height + itemGap,
		...defaultScale$1
	};
	return {
		x: 0,
		y: 0,
		...defaultScale$1
	};
};
function getItemGap$1(clientRects, index, activeIndex) {
	const currentRect = clientRects[index];
	const previousRect = clientRects[index - 1];
	const nextRect = clientRects[index + 1];
	if (!currentRect) return 0;
	if (activeIndex < index) return previousRect ? currentRect.top - (previousRect.top + previousRect.height) : nextRect ? nextRect.top - (currentRect.top + currentRect.height) : 0;
	return nextRect ? nextRect.top - (currentRect.top + currentRect.height) : previousRect ? currentRect.top - (previousRect.top + previousRect.height) : 0;
}
var ID_PREFIX = "Sortable";
var Context = /*#__PURE__*/ import_react.createContext({
	activeIndex: -1,
	containerId: ID_PREFIX,
	disableTransforms: false,
	items: [],
	overIndex: -1,
	useDragOverlay: false,
	sortedRects: [],
	strategy: rectSortingStrategy,
	disabled: {
		draggable: false,
		droppable: false
	}
});
function SortableContext(_ref) {
	let { children, id, items: userDefinedItems, strategy = rectSortingStrategy, disabled: disabledProp = false } = _ref;
	const { active, dragOverlay, droppableRects, over, measureDroppableContainers } = useDndContext();
	const containerId = useUniqueId(ID_PREFIX, id);
	const useDragOverlay = Boolean(dragOverlay.rect !== null);
	const items = (0, import_react.useMemo)(() => userDefinedItems.map((item) => typeof item === "object" && "id" in item ? item.id : item), [userDefinedItems]);
	const isDragging = active != null;
	const activeIndex = active ? items.indexOf(active.id) : -1;
	const overIndex = over ? items.indexOf(over.id) : -1;
	const previousItemsRef = (0, import_react.useRef)(items);
	const itemsHaveChanged = !itemsEqual(items, previousItemsRef.current);
	const disableTransforms = overIndex !== -1 && activeIndex === -1 || itemsHaveChanged;
	const disabled = normalizeDisabled(disabledProp);
	useIsomorphicLayoutEffect(() => {
		if (itemsHaveChanged && isDragging) measureDroppableContainers(items);
	}, [
		itemsHaveChanged,
		items,
		isDragging,
		measureDroppableContainers
	]);
	(0, import_react.useEffect)(() => {
		previousItemsRef.current = items;
	}, [items]);
	const contextValue = (0, import_react.useMemo)(() => ({
		activeIndex,
		containerId,
		disabled,
		disableTransforms,
		items,
		overIndex,
		useDragOverlay,
		sortedRects: getSortedRects(items, droppableRects),
		strategy
	}), [
		activeIndex,
		containerId,
		disabled.draggable,
		disabled.droppable,
		disableTransforms,
		items,
		overIndex,
		droppableRects,
		useDragOverlay,
		strategy
	]);
	return import_react.createElement(Context.Provider, { value: contextValue }, children);
}
var defaultNewIndexGetter = (_ref) => {
	let { id, items, activeIndex, overIndex } = _ref;
	return arrayMove(items, activeIndex, overIndex).indexOf(id);
};
var defaultAnimateLayoutChanges = (_ref2) => {
	let { containerId, isSorting, wasDragging, index, items, newIndex, previousItems, previousContainerId, transition } = _ref2;
	if (!transition || !wasDragging) return false;
	if (previousItems !== items && index === newIndex) return false;
	if (isSorting) return true;
	return newIndex !== index && containerId === previousContainerId;
};
var defaultTransition = {
	duration: 200,
	easing: "ease"
};
var transitionProperty = "transform";
var disabledTransition = /*#__PURE__*/ CSS.Transition.toString({
	property: transitionProperty,
	duration: 0,
	easing: "linear"
});
var defaultAttributes = { roleDescription: "sortable" };
function useDerivedTransform(_ref) {
	let { disabled, index, node, rect } = _ref;
	const [derivedTransform, setDerivedtransform] = (0, import_react.useState)(null);
	const previousIndex = (0, import_react.useRef)(index);
	useIsomorphicLayoutEffect(() => {
		if (!disabled && index !== previousIndex.current && node.current) {
			const initial = rect.current;
			if (initial) {
				const current = getClientRect(node.current, { ignoreTransform: true });
				const delta = {
					x: initial.left - current.left,
					y: initial.top - current.top,
					scaleX: initial.width / current.width,
					scaleY: initial.height / current.height
				};
				if (delta.x || delta.y) setDerivedtransform(delta);
			}
		}
		if (index !== previousIndex.current) previousIndex.current = index;
	}, [
		disabled,
		index,
		node,
		rect
	]);
	(0, import_react.useEffect)(() => {
		if (derivedTransform) setDerivedtransform(null);
	}, [derivedTransform]);
	return derivedTransform;
}
function useSortable(_ref) {
	let { animateLayoutChanges = defaultAnimateLayoutChanges, attributes: userDefinedAttributes, disabled: localDisabled, data: customData, getNewIndex = defaultNewIndexGetter, id, strategy: localStrategy, resizeObserverConfig, transition = defaultTransition } = _ref;
	const { items, containerId, activeIndex, disabled: globalDisabled, disableTransforms, sortedRects, overIndex, useDragOverlay, strategy: globalStrategy } = (0, import_react.useContext)(Context);
	const disabled = normalizeLocalDisabled(localDisabled, globalDisabled);
	const index = items.indexOf(id);
	const data = (0, import_react.useMemo)(() => ({
		sortable: {
			containerId,
			index,
			items
		},
		...customData
	}), [
		containerId,
		customData,
		index,
		items
	]);
	const itemsAfterCurrentSortable = (0, import_react.useMemo)(() => items.slice(items.indexOf(id)), [items, id]);
	const { rect, node, isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
		id,
		data,
		disabled: disabled.droppable,
		resizeObserverConfig: {
			updateMeasurementsFor: itemsAfterCurrentSortable,
			...resizeObserverConfig
		}
	});
	const { active, activatorEvent, activeNodeRect, attributes, setNodeRef: setDraggableNodeRef, listeners, isDragging, over, setActivatorNodeRef, transform } = useDraggable({
		id,
		data,
		attributes: {
			...defaultAttributes,
			...userDefinedAttributes
		},
		disabled: disabled.draggable
	});
	const setNodeRef = useCombinedRefs(setDroppableNodeRef, setDraggableNodeRef);
	const isSorting = Boolean(active);
	const displaceItem = isSorting && !disableTransforms && isValidIndex(activeIndex) && isValidIndex(overIndex);
	const shouldDisplaceDragSource = !useDragOverlay && isDragging;
	const dragSourceDisplacement = shouldDisplaceDragSource && displaceItem ? transform : null;
	const finalTransform = displaceItem ? dragSourceDisplacement != null ? dragSourceDisplacement : (localStrategy != null ? localStrategy : globalStrategy)({
		rects: sortedRects,
		activeNodeRect,
		activeIndex,
		overIndex,
		index
	}) : null;
	const newIndex = isValidIndex(activeIndex) && isValidIndex(overIndex) ? getNewIndex({
		id,
		items,
		activeIndex,
		overIndex
	}) : index;
	const activeId = active == null ? void 0 : active.id;
	const previous = (0, import_react.useRef)({
		activeId,
		items,
		newIndex,
		containerId
	});
	const itemsHaveChanged = items !== previous.current.items;
	const shouldAnimateLayoutChanges = animateLayoutChanges({
		active,
		containerId,
		isDragging,
		isSorting,
		id,
		index,
		items,
		newIndex: previous.current.newIndex,
		previousItems: previous.current.items,
		previousContainerId: previous.current.containerId,
		transition,
		wasDragging: previous.current.activeId != null
	});
	const derivedTransform = useDerivedTransform({
		disabled: !shouldAnimateLayoutChanges,
		index,
		node,
		rect
	});
	(0, import_react.useEffect)(() => {
		if (isSorting && previous.current.newIndex !== newIndex) previous.current.newIndex = newIndex;
		if (containerId !== previous.current.containerId) previous.current.containerId = containerId;
		if (items !== previous.current.items) previous.current.items = items;
	}, [
		isSorting,
		newIndex,
		containerId,
		items
	]);
	(0, import_react.useEffect)(() => {
		if (activeId === previous.current.activeId) return;
		if (activeId != null && previous.current.activeId == null) {
			previous.current.activeId = activeId;
			return;
		}
		const timeoutId = setTimeout(() => {
			previous.current.activeId = activeId;
		}, 50);
		return () => clearTimeout(timeoutId);
	}, [activeId]);
	return {
		active,
		activeIndex,
		attributes,
		data,
		rect,
		index,
		newIndex,
		items,
		isOver,
		isSorting,
		isDragging,
		listeners,
		node,
		overIndex,
		over,
		setNodeRef,
		setActivatorNodeRef,
		setDroppableNodeRef,
		setDraggableNodeRef,
		transform: derivedTransform != null ? derivedTransform : finalTransform,
		transition: getTransition()
	};
	function getTransition() {
		if (derivedTransform || itemsHaveChanged && previous.current.newIndex === index) return disabledTransition;
		if (shouldDisplaceDragSource && !isKeyboardEvent(activatorEvent) || !transition) return;
		if (isSorting || shouldAnimateLayoutChanges) return CSS.Transition.toString({
			...transition,
			property: transitionProperty
		});
	}
}
function normalizeLocalDisabled(localDisabled, globalDisabled) {
	var _localDisabled$dragga, _localDisabled$droppa;
	if (typeof localDisabled === "boolean") return {
		draggable: localDisabled,
		droppable: false
	};
	return {
		draggable: (_localDisabled$dragga = localDisabled == null ? void 0 : localDisabled.draggable) != null ? _localDisabled$dragga : globalDisabled.draggable,
		droppable: (_localDisabled$droppa = localDisabled == null ? void 0 : localDisabled.droppable) != null ? _localDisabled$droppa : globalDisabled.droppable
	};
}
KeyboardCode.Down, KeyboardCode.Right, KeyboardCode.Up, KeyboardCode.Left;
//#endregion
export { verticalListSortingStrategy as i, arrayMove as n, useSortable as r, SortableContext as t };
