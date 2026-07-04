//#region src/ServerComponentTypes.ts
var SERVER_COMPONENT_STREAM = Symbol.for("tanstack.rsc.stream");
var SERVER_COMPONENT_CSS_HREFS = Symbol.for("tanstack.rsc.cssHrefs");
var SERVER_COMPONENT_JS_PRELOADS = Symbol.for("tanstack.rsc.jsPreloads");
var RSC_PROXY_PATH = Symbol.for("tanstack.rsc.path");
var RSC_PROXY_GET_TREE = Symbol.for("tanstack.rsc.getTree");
var RENDERABLE_RSC = Symbol.for("tanstack.rsc.renderable");
var RSC_SLOT_USAGES = Symbol.for("tanstack.rsc.slotUsages");
var RSC_SLOT_USAGES_STREAM = Symbol.for("tanstack.rsc.slotUsages.stream");
/**
* Type guard to check if a value is a ServerComponent (Proxy with attached stream).
* The value can be either an object (proxy target) or a function (stub for server functions).
*/
function isServerComponent(value) {
	if (value === null || value === void 0) return false;
	if (typeof value !== "object" && typeof value !== "function") return false;
	return SERVER_COMPONENT_STREAM in value && value[SERVER_COMPONENT_STREAM] !== void 0;
}
//#endregion
export { RENDERABLE_RSC, RSC_PROXY_GET_TREE, RSC_PROXY_PATH, RSC_SLOT_USAGES, RSC_SLOT_USAGES_STREAM, SERVER_COMPONENT_CSS_HREFS, SERVER_COMPONENT_JS_PRELOADS, SERVER_COMPONENT_STREAM, isServerComponent };

//# sourceMappingURL=ServerComponentTypes.js.map