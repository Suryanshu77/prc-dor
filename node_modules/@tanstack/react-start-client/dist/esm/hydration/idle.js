"use client";
import { GenericHydrate } from "../GenericHydrate.js";
import { idle, withHydrationRenderer } from "@tanstack/start-client-core/hydration";
//#region src/hydration/idle.ts
/* @__NO_SIDE_EFFECTS__ */
function idle$1(options = {}) {
	return /* @__PURE__ */ withHydrationRenderer(idle(options), GenericHydrate);
}
//#endregion
export { idle$1 as idle };

//# sourceMappingURL=idle.js.map