"use client";
import { GenericHydrate } from "../GenericHydrate.js";
import { condition, interaction, media, withHydrationRenderer } from "@tanstack/start-client-core/hydration";
//#region src/hydration/generic.ts
/* @__NO_SIDE_EFFECTS__ */
function media$1(query) {
	return /* @__PURE__ */ withHydrationRenderer(media(query), GenericHydrate);
}
/* @__NO_SIDE_EFFECTS__ */
function condition$1(condition$2) {
	return /* @__PURE__ */ withHydrationRenderer(condition(condition$2), GenericHydrate);
}
/* @__NO_SIDE_EFFECTS__ */
function interaction$1(options) {
	return /* @__PURE__ */ withHydrationRenderer(interaction(options), GenericHydrate);
}
//#endregion
export { condition$1 as condition, interaction$1 as interaction, media$1 as media };

//# sourceMappingURL=generic.js.map