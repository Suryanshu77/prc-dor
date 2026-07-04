//#region src/renderServerComponent.stub.ts
/**
* Client stub for renderServerComponent.
*
* This function should never be called at runtime on the client.
* It exists only to satisfy bundler imports in client bundles.
* The real implementation only runs inside server functions.
*/
function renderServerComponent(_node) {
	if (process.env.NODE_ENV === "test") return Promise.resolve(null);
	throw new Error("renderServerComponent cannot be called on the client. This function should only be called inside a server function or route loader.");
}
//#endregion
export { renderServerComponent };

//# sourceMappingURL=renderServerComponent.stub.js.map