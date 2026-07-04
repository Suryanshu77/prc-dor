import { createRscCssCompilerTransforms } from "./rscCssTransform.js";
import { fileURLToPath } from "node:url";
import path from "pathe";
import { createVirtualModule } from "@tanstack/start-plugin-core/vite";
//#region src/plugin/vite.ts
var isClientEnvironment = (env) => env.config.consumer === "client";
var RSC_HMR_VIRTUAL_ID = "virtual:tanstack-rsc-hmr";
var RSC_RUNTIME_VIRTUAL_ID = "virtual:tanstack-rsc-runtime";
var RSC_BROWSER_DECODE_VIRTUAL_ID = "virtual:tanstack-rsc-browser-decode";
var RSC_SSR_DECODE_VIRTUAL_ID = "virtual:tanstack-rsc-ssr-decode";
var RSC_ENV_NAME = "rsc";
var currentDir = path.dirname(fileURLToPath(import.meta.url));
var entryDir = path.resolve(currentDir, "..", "..", "plugin", "entry");
var rscEntryPath = path.resolve(entryDir, "rsc.tsx");
function configureRsc() {
	return {
		envName: RSC_ENV_NAME,
		providerEnvironmentName: RSC_ENV_NAME,
		ssrResolverStrategy: {
			type: "vite-rsc-forward",
			sourceEnvironmentName: RSC_ENV_NAME,
			sourceEntry: "index",
			exportName: "getServerFnById"
		},
		serializationAdapters: [{
			client: {
				module: "@tanstack/react-start/rsc/serialization/client",
				export: "rscSerializationAdapter",
				isFactory: true
			},
			server: {
				module: "@tanstack/react-start/rsc/serialization/server",
				export: "rscSerializationAdapter",
				isFactory: true
			}
		}],
		compilerTransforms: createRscCssCompilerTransforms({ loadCssExpression: "import.meta.viteRsc.loadCss()" })
	};
}
function reactStartRscVitePlugin() {
	return [
		{
			name: "tanstack-react-start:rsc-ssr-config",
			config() {
				return { ssr: { noExternal: true } };
			}
		},
		{
			name: "tanstack-react-start:rsc-env-config",
			config() {
				return {
					rsc: {
						serverHandler: false,
						cssLinkPrecedence: false
					},
					environments: { [RSC_ENV_NAME]: {
						consumer: "server",
						resolve: { noExternal: [
							"@tanstack/start**",
							"@tanstack/react-start",
							"@tanstack/react-start-rsc",
							"@tanstack/react-router"
						] },
						build: { rollupOptions: { input: { index: rscEntryPath } } }
					} }
				};
			}
		},
		{
			name: "tanstack-react-start:rsc-scan-virtual-fallback",
			apply: "build",
			applyToEnvironment(env) {
				return env.name === RSC_ENV_NAME;
			},
			load: {
				filter: { id: /^(virtual:tanstack-rsc-runtime|virtual:vite-rsc\/encryption-key)$/ },
				handler(id) {
					if (this.environment.config.build.write !== false) return;
					if (id === RSC_RUNTIME_VIRTUAL_ID) return `export { renderToReadableStream, createFromReadableStream, createTemporaryReferenceSet, decodeReply, loadServerAction, decodeAction, decodeFormState } from '@vitejs/plugin-rsc/rsc'`;
					if (id === "virtual:vite-rsc/encryption-key") return `export default () => ''`;
				}
			}
		},
		createVirtualModule({
			name: "tanstack-react-start:rsc-runtime-virtual",
			moduleId: RSC_RUNTIME_VIRTUAL_ID,
			load() {
				if (this.environment.name === RSC_ENV_NAME) return `export { renderToReadableStream, createFromReadableStream, createTemporaryReferenceSet, decodeReply, loadServerAction, decodeAction, decodeFormState } from '@vitejs/plugin-rsc/rsc'`;
				return `
export function renderToReadableStream() { throw new Error('renderToReadableStream can only be used in RSC environment'); }
export function createFromReadableStream() { throw new Error('createFromReadableStream can only be used in RSC environment'); }
export function createTemporaryReferenceSet() { throw new Error('createTemporaryReferenceSet can only be used in RSC environment'); }
export function decodeReply() { throw new Error('decodeReply can only be used in RSC environment'); }
export function loadServerAction() { throw new Error('loadServerAction can only be used in RSC environment'); }
export function decodeAction() { throw new Error('decodeAction can only be used in RSC environment'); }
export function decodeFormState() { throw new Error('decodeFormState can only be used in RSC environment'); }
`;
			}
		}),
		createVirtualModule({
			name: "tanstack-react-start:rsc-browser-decode-virtual",
			moduleId: RSC_BROWSER_DECODE_VIRTUAL_ID,
			load() {
				return `export { createFromReadableStream, createFromFetch } from '@vitejs/plugin-rsc/browser'`;
			}
		}),
		createVirtualModule({
			name: "tanstack-react-start:rsc-ssr-decode-virtual",
			moduleId: RSC_SSR_DECODE_VIRTUAL_ID,
			load() {
				return `export { setOnClientReference, createFromReadableStream } from '@vitejs/plugin-rsc/ssr'`;
			}
		}),
		createVirtualModule({
			name: "tanstack-react-start:rsc-hmr-virtual:dev",
			moduleId: RSC_HMR_VIRTUAL_ID,
			apply: "serve",
			applyToEnvironment: isClientEnvironment,
			load() {
				return `
export function setupRscHmr() {
if (!import.meta.hot) {
  return
}

  let __invalidateQueued = false

  function __queueInvalidate() {
    if (__invalidateQueued) return
    __invalidateQueued = true
    queueMicrotask(async () => {
        __invalidateQueued = false
        try {
        const router = window.__TSR_ROUTER__
        if (!router) {
            console.warn('[rsc:hmr] No router found on window.__TSR_ROUTER__')
            return
        }
        await router.invalidate()
        } catch (e) {
        console.warn('[rsc:hmr] Failed to invalidate router:', e)
        }
    })
  }

  import.meta.hot.on('rsc:update', () => {
    __queueInvalidate()
  })
}
`;
			}
		}),
		createVirtualModule({
			name: "tanstack-react-start:rsc-hmr-virtual:prod",
			moduleId: RSC_HMR_VIRTUAL_ID,
			applyToEnvironment: isClientEnvironment,
			apply: "build",
			load() {
				return "export function setupRscHmr() {} ";
			}
		})
	];
}
//#endregion
export { configureRsc, reactStartRscVitePlugin };

//# sourceMappingURL=vite.js.map