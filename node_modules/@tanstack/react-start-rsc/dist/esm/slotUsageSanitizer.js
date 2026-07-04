import { isValidElement } from "react";
//#region src/slotUsageSanitizer.ts
var REACT_ELEMENT_TYPE = Symbol.for("react.element");
var REACT_TRANSITIONAL_ELEMENT_TYPE = Symbol.for("react.transitional.element");
var REACT_PORTAL_TYPE = Symbol.for("react.portal");
function isReactElementLike(value) {
	if (!value || typeof value !== "object" && typeof value !== "function") return false;
	if (isValidElement(value)) return true;
	const t = value.$$typeof;
	return t === REACT_ELEMENT_TYPE || t === REACT_TRANSITIONAL_ELEMENT_TYPE || t === REACT_PORTAL_TYPE;
}
var REACT_ELEMENT_PLACEHOLDER = "React element";
function sanitizeSlotArg(value, seen, depth) {
	if (isReactElementLike(value)) return REACT_ELEMENT_PLACEHOLDER;
	if (value === null || value === void 0) return value;
	if (typeof value !== "object" && typeof value !== "function") return value;
	if (Array.isArray(value)) return value.map((d) => sanitizeSlotArg(d, seen, depth + 1));
	const proto = Object.getPrototypeOf(value);
	if (proto === Object.prototype || proto === null) {
		const out = {};
		for (const [k, v] of Object.entries(value)) out[k] = sanitizeSlotArg(v, seen, depth + 1);
		return out;
	}
	return value;
}
function sanitizeSlotArgs(args) {
	const seen = /* @__PURE__ */ new WeakSet();
	return args.map((d) => sanitizeSlotArg(d, seen, 0));
}
//#endregion
export { sanitizeSlotArgs };

//# sourceMappingURL=slotUsageSanitizer.js.map