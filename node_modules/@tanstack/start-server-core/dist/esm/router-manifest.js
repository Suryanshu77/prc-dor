import { DEV_STYLES_ATTR, buildDevStylesUrl, rootRouteId } from "@tanstack/router-core";
//#region src/router-manifest.ts
var DEV_SSR_STYLES_BASEPATH = process.env.TSS_DEV_SSR_STYLES_BASEPATH || "/";
/**
* @description Returns the router manifest data that should be sent to the client.
* This includes only the assets and preloads for the current route and any
* special assets that are needed for the client. It does not include relationships
* between routes or any other data that is not needed for the client.
*
* @param matchedRoutes - In dev mode, the matched routes are used to build
* the dev styles URL for route-scoped CSS collection.
*/
async function getStartManifest(matchedRoutes) {
	const { tsrStartManifest } = await import("tanstack-start-manifest:v");
	const startManifest = tsrStartManifest();
	let routes = startManifest.routes;
	let rootRoute = routes[rootRouteId];
	const updateRootRoute = (nextRootRoute) => {
		rootRoute = nextRootRoute;
		routes = {
			...routes,
			[rootRouteId]: rootRoute
		};
	};
	if (process.env.TSS_DEV_SERVER === "true" && process.env.TSS_DEV_SSR_STYLES_ENABLED !== "false" && matchedRoutes) {
		const matchedRouteIds = matchedRoutes.map((route) => route.id);
		updateRootRoute({
			...rootRoute,
			css: [...rootRoute?.css ?? [], {
				href: buildDevStylesUrl(DEV_SSR_STYLES_BASEPATH, matchedRouteIds),
				[DEV_STYLES_ATTR]: true
			}]
		});
	}
	const manifestRoutes = {};
	for (const k in routes) {
		const v = routes[k];
		const result = {};
		if (v.preloads && v.preloads.length > 0) result.preloads = v.preloads;
		if (v.scripts && v.scripts.length > 0) result.scripts = v.scripts;
		if (v.css?.length) result.css = v.css;
		if (result.preloads || result.scripts || result.css) manifestRoutes[k] = result;
	}
	return {
		...startManifest.scriptFormat ? { scriptFormat: startManifest.scriptFormat } : {},
		...startManifest.inlineCss ? { inlineCss: startManifest.inlineCss } : {},
		routes: manifestRoutes
	};
}
//#endregion
export { getStartManifest };

//# sourceMappingURL=router-manifest.js.map