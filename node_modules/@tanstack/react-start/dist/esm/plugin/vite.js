import { reactStartDefaultEntryPaths, reactStartPluginDir } from "./shared.js";
import path from "pathe";
import { START_ENVIRONMENT_NAMES, tanStackStartVite } from "@tanstack/start-plugin-core/vite";
import { configureRsc, reactStartRscVitePlugin } from "@tanstack/react-start-rsc/plugin/vite";
//#region src/plugin/vite.ts
var isInsideRouterMonoRepo = path.basename(path.resolve(reactStartPluginDir, "../../../../")) === "packages";
function tanstackStart(options) {
	const rscConfig = options?.rsc?.enabled ?? false ? configureRsc() : void 0;
	let corePluginOpts = {
		framework: "react",
		defaultEntryPaths: reactStartDefaultEntryPaths,
		providerEnvironmentName: START_ENVIRONMENT_NAMES.server,
		ssrIsProvider: true,
		ssrResolverStrategy: { type: "default" }
	};
	const serverEnvironments = [START_ENVIRONMENT_NAMES.server, ...rscConfig ? [rscConfig.envName] : []];
	if (rscConfig) corePluginOpts = {
		...corePluginOpts,
		providerEnvironmentName: rscConfig.providerEnvironmentName,
		ssrIsProvider: false,
		ssrResolverStrategy: rscConfig.ssrResolverStrategy,
		serializationAdapters: rscConfig.serializationAdapters,
		compilerTransforms: rscConfig.compilerTransforms
	};
	return [
		{
			name: "tanstack-react-start:config",
			configEnvironment(environmentName, options) {
				const needsOptimizeDeps = environmentName === START_ENVIRONMENT_NAMES.client || serverEnvironments.includes(environmentName) && options.optimizeDeps?.noDiscovery === false;
				const reactRouterInNoExternal = Array.isArray(options.resolve?.noExternal) && options.resolve.noExternal.some((pattern) => pattern === "@tanstack/react-router" || typeof pattern === "string" && pattern.includes("react-router"));
				return {
					resolve: {
						dedupe: [
							"react",
							"react-dom",
							"@tanstack/react-start",
							"@tanstack/react-router"
						],
						external: options.resolve?.noExternal === true || !isInsideRouterMonoRepo || reactRouterInNoExternal ? void 0 : ["@tanstack/react-router", "@tanstack/react-router-devtools"]
					},
					optimizeDeps: needsOptimizeDeps ? {
						exclude: [
							"@tanstack/react-start",
							"@tanstack/react-router",
							"@tanstack/react-router-devtools",
							"@tanstack/start-static-server-functions"
						],
						include: [
							"react",
							"react/jsx-runtime",
							"react/jsx-dev-runtime",
							"react-dom",
							...environmentName === START_ENVIRONMENT_NAMES.client ? ["react-dom/client"] : ["react-dom/server"],
							"@tanstack/react-router > @tanstack/react-store",
							...options.optimizeDeps?.exclude?.find((x) => x === "@tanstack/react-form") ? ["@tanstack/react-form > @tanstack/react-store"] : []
						]
					} : void 0
				};
			}
		},
		rscConfig ? reactStartRscVitePlugin() : null,
		tanStackStartVite(corePluginOpts, options)
	];
}
//#endregion
export { tanstackStart };

//# sourceMappingURL=vite.js.map