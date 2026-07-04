//#region src/hydration/renderer.ts
/* @__NO_SIDE_EFFECTS__ */
function withHydrationRenderer(strategy, renderer) {
	return /* @__PURE__ */ Object.assign(strategy, { _h: renderer });
}
//#endregion
export { withHydrationRenderer };

//# sourceMappingURL=renderer.js.map