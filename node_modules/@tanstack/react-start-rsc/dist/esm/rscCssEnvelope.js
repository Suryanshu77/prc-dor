//#region src/rscCssEnvelope.ts
var RSC_CSS_ENVELOPE_MARKER = "__tanstackStartRscCssEnvelope";
var RSC_CSS_ENVELOPE_RESOURCES = "__tanstackStartRscCss";
var RSC_CSS_ENVELOPE_VALUE = "__tanstackStartRscValue";
function createRscCssEnvelope(value, options) {
	const resources = options?.[RSC_CSS_ENVELOPE_RESOURCES];
	if (resources === void 0 || resources === null || resources === false) return value;
	return {
		[RSC_CSS_ENVELOPE_MARKER]: true,
		[RSC_CSS_ENVELOPE_RESOURCES]: resources,
		[RSC_CSS_ENVELOPE_VALUE]: value
	};
}
function unwrapRscCssEnvelope(value) {
	if (!value || typeof value !== "object") return value;
	const maybeEnvelope = value;
	if (maybeEnvelope[RSC_CSS_ENVELOPE_MARKER] !== true) return value;
	return maybeEnvelope[RSC_CSS_ENVELOPE_VALUE];
}
//#endregion
export { createRscCssEnvelope, unwrapRscCssEnvelope };

//# sourceMappingURL=rscCssEnvelope.js.map