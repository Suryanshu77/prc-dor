//#region src/hydration/load.ts
var loadStrategy = {
	_t: "load",
	_d: () => false,
	_s: ({ gate, prefetch }) => {
		(prefetch ?? gate.resolve)();
	}
};
/* @__NO_SIDE_EFFECTS__ */
function load() {
	return loadStrategy;
}
//#endregion
export { load };

//# sourceMappingURL=load.js.map