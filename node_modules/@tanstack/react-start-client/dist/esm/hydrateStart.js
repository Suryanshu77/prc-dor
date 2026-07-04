import { hydrateStart } from "@tanstack/start-client-core/client";
//#region src/hydrateStart.ts
/**
* React-specific wrapper for hydrateStart that signals hydration completion
*/
async function hydrateStart$1() {
	const router = await hydrateStart();
	window.$_TSR?.h();
	return router;
}
//#endregion
export { hydrateStart$1 as hydrateStart };

//# sourceMappingURL=hydrateStart.js.map