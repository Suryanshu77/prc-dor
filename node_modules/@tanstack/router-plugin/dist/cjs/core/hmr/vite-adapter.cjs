const require_runtime = require("../../_virtual/_rolldown/runtime.cjs");
const require_handle_route_update = require("./handle-route-update.cjs");
let _babel_template = require("@babel/template");
_babel_template = require_runtime.__toESM(_babel_template, 1);
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
	const handleRouteUpdateCode = require_handle_route_update.getHandleRouteUpdateCode(stableRouteOptionKeys);
	const routeIdFallback = typeof opts.routeId === "string" ? JSON.stringify(opts.routeId) : "Route.id";
	return [_babel_template.statement(`
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
exports.createViteHmrStatement = createViteHmrStatement;

//# sourceMappingURL=vite-adapter.cjs.map