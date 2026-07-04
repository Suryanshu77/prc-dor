import { createFromReadableStream } from "react-server-dom-rspack/client.node";
//#region src/rsbuild/ssr-decode.ts
/**
* Rsbuild SSR decode implementation.
*
* Bundler-owned rsbuild virtual modules re-export this module for SSR-side
* Flight decode.
*/
var CHUNK_FILENAME_INDEX = 1;
var CHUNK_PAIR_SIZE = 2;
var onClientReference;
var clientReferenceDepsByModuleId;
function getClientReferenceDepsByModuleId() {
	if (clientReferenceDepsByModuleId) return clientReferenceDepsByModuleId;
	clientReferenceDepsByModuleId = /* @__PURE__ */ new Map();
	const prefix = __rspack_rsc_manifest__.moduleLoading?.prefix ?? "";
	for (const entry of Object.values(__rspack_rsc_manifest__.clientManifest)) {
		let deps = clientReferenceDepsByModuleId.get(entry.id);
		if (!deps) {
			deps = {
				js: [],
				css: []
			};
			clientReferenceDepsByModuleId.set(entry.id, deps);
		}
		for (let i = CHUNK_FILENAME_INDEX; i < entry.chunks.length; i += CHUNK_PAIR_SIZE) deps.js.push(prefix + entry.chunks[i]);
		if (entry.cssFiles) deps.css.push(...entry.cssFiles);
	}
	return clientReferenceDepsByModuleId;
}
function emitClientReferencePreloadsForModule(moduleId) {
	const deps = getClientReferenceDepsByModuleId().get(moduleId);
	if (!onClientReference || !deps) return;
	if (deps.js.length === 0 && deps.css.length === 0) return;
	onClientReference({
		id: moduleId,
		deps,
		runtime: "rsbuild"
	});
}
if (__rspack_rsc_manifest__.serverConsumerModuleMap) __rspack_rsc_manifest__.serverConsumerModuleMap = new Proxy(__rspack_rsc_manifest__.serverConsumerModuleMap, { get(target, property, receiver) {
	const moduleExports = Reflect.get(target, property, receiver);
	if (typeof property === "string" && moduleExports !== void 0) emitClientReferencePreloadsForModule(property);
	return moduleExports;
} });
function setOnClientReference(callback) {
	onClientReference = callback;
}
async function createFromReadableStreamWithClientPreloads(stream, options) {
	return createFromReadableStream(stream, options);
}
//#endregion
export { createFromReadableStreamWithClientPreloads as createFromReadableStream, setOnClientReference };

//# sourceMappingURL=ssr-decode.js.map