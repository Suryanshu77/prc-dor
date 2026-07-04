//#region src/hydration/idle.ts
var idleType = "idle";
function idle(options = {}) {
	const timeout = options.timeout ?? 2e3;
	return {
		_t: idleType,
		_s: ({ gate, prefetch }) => {
			const schedule = globalThis;
			const callback = prefetch ?? gate.resolve;
			if (schedule.requestIdleCallback) {
				const handle = schedule.requestIdleCallback(callback, { timeout });
				return () => schedule.cancelIdleCallback?.(handle);
			}
			const timeoutId = globalThis.setTimeout(callback, timeout);
			return () => globalThis.clearTimeout(timeoutId);
		}
	};
}
//#endregion
export { idle };

//# sourceMappingURL=idle.js.map