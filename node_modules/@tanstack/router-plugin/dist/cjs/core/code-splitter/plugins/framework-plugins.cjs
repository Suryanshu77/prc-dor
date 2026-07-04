const require_react_refresh_ignored_route_exports = require("./react-refresh-ignored-route-exports.cjs");
const require_react_refresh_route_components = require("./react-refresh-route-components.cjs");
const require_react_stable_hmr_split_route_components = require("./react-stable-hmr-split-route-components.cjs");
//#region src/core/code-splitter/plugins/framework-plugins.ts
function getReferenceRouteCompilerPlugins(opts) {
	switch (opts.targetFramework) {
		case "react":
			if (opts.addHmr) {
				const hmrStyle = opts.hmrStyle ?? "vite";
				return [
					...hmrStyle === "vite" ? [require_react_refresh_ignored_route_exports.createReactRefreshIgnoredRouteExportsPlugin()] : [],
					require_react_refresh_route_components.createReactRefreshRouteComponentsPlugin(),
					require_react_stable_hmr_split_route_components.createReactStableHmrSplitRouteComponentsPlugin({ hmrStyle })
				];
			}
			return;
		default: return;
	}
}
//#endregion
exports.getReferenceRouteCompilerPlugins = getReferenceRouteCompilerPlugins;

//# sourceMappingURL=framework-plugins.cjs.map