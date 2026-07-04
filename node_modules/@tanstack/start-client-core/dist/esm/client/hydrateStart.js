import { ServerFunctionSerializationAdapter } from "./ServerFunctionSerializationAdapter.js";
import { hydrate } from "@tanstack/router-core/ssr/client";
import { startInstance } from "#tanstack-start-entry";
import { hasPluginAdapters, pluginSerializationAdapters } from "#tanstack-start-plugin-adapters";
import { getRouter } from "#tanstack-router-entry";
//#region src/client/hydrateStart.ts
async function hydrateStart() {
	const router = await getRouter();
	let serializationAdapters;
	if (startInstance) {
		const startOptions = await startInstance.getOptions();
		startOptions.serializationAdapters = startOptions.serializationAdapters ?? [];
		window.__TSS_START_OPTIONS__ = startOptions;
		serializationAdapters = startOptions.serializationAdapters;
		router.options.defaultSsr = startOptions.defaultSsr;
	} else {
		serializationAdapters = [];
		window.__TSS_START_OPTIONS__ = { serializationAdapters };
	}
	if (hasPluginAdapters) serializationAdapters.push(...pluginSerializationAdapters);
	serializationAdapters.push(ServerFunctionSerializationAdapter);
	if (router.options.serializationAdapters) serializationAdapters.push(...router.options.serializationAdapters);
	router.update({
		basepath: process.env.TSS_ROUTER_BASEPATH,
		serializationAdapters
	});
	if (!router.stores.matchesId.get().length) await hydrate(router);
	return router;
}
function hydrateStartWithHmr() {
	const hot = import.meta.hot ?? import.meta.webpackHot;
	if (!hot) return hydrateStart();
	const key = "tss-hydrate-start-promise";
	const hotData = hot.data ??= {};
	let hydrationPromise = hotData[key];
	if (!hydrationPromise) {
		hydrationPromise = hydrateStart().catch((error) => {
			if (hotData[key] === hydrationPromise) hotData[key] = void 0;
			throw error;
		});
		hotData[key] = hydrationPromise;
	}
	hot.dispose?.((data) => {
		data[key] = hotData[key];
	});
	return hydrationPromise;
}
var exportedHydrateStart = process.env.NODE_ENV !== "production" ? hydrateStartWithHmr : hydrateStart;
//#endregion
export { exportedHydrateStart };

//# sourceMappingURL=hydrateStart.js.map