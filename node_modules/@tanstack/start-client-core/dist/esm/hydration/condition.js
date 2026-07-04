//#region src/hydration/condition.ts
var conditionType = "condition";
/* @__NO_SIDE_EFFECTS__ */
function condition(condition) {
	return {
		_t: conditionType,
		_d: () => !(typeof condition === "function" ? condition() : condition),
		_s: ({ gate }) => {
			if (typeof condition === "function" ? condition() : condition) gate.resolve();
		}
	};
}
//#endregion
export { condition };

//# sourceMappingURL=condition.js.map