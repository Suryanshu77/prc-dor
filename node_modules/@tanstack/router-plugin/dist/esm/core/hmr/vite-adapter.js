import { getHandleRouteUpdateCode } from "./handle-route-update.js";
import * as template from "@babel/template";
//#region src/core/hmr/vite-adapter.ts
/**
* Emits HMR accept code for Vite / native ESM HMR: `import.meta.hot.accept`
* with a callback that receives the freshly re-imported module.
*
* `targetFramework` is currently unused — Vite's framework-specific fast-refresh
* plugins handle component body patching via their own accept boundaries — but
* we take it for API symmetry with `createWebpackHmrStatement`.
*/
function createViteHmrStatement(stableRouteOptionKeys, opts = {}) {
	const handleRouteUpdateCode = getHandleRouteUpdateCode(stableRouteOptionKeys);
	const routeIdFallback = typeof opts.routeId === "string" ? JSON.stringify(opts.routeId) : "Route.id";
	return [template.statement(`
if (import.meta.hot) {
  const hot = import.meta.hot
  const hotData = hot.data ??= {}
  const handleRouteUpdate = ${handleRouteUpdateCode}
  const initialRouteId = ${routeIdFallback} ?? hotData['tsr-route-id']
  if (initialRouteId) {
    hotData['tsr-route-id'] = initialRouteId
  }
  const existingRoute =
    typeof window !== 'undefined' && initialRouteId
      ? window.__TSR_ROUTER__?.routesById?.[initialRouteId]
      : undefined
  if (initialRouteId && existingRoute && existingRoute !== Route) {
    handleRouteUpdate(initialRouteId, Route)
    hotData['tsr-route-update-handled'] = Route
  }
  hot.accept((newModule) => {
    if (Route && newModule && newModule.Route) {
      const routeId = hotData['tsr-route-id'] ?? ${routeIdFallback}
      if (routeId) {
        hotData['tsr-route-id'] = routeId
      }
      if (hotData['tsr-route-update-handled'] === newModule.Route) {
        delete hotData['tsr-route-update-handled']
        return
      }
      handleRouteUpdate(routeId, newModule.Route)
    }
    })
}
`, { syntacticPlaceholders: true })()];
}
//#endregion
export { createViteHmrStatement };

//# sourceMappingURL=vite-adapter.js.map