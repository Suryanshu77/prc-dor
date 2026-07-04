//#region src/flight.stub.ts
/**
* Client stub for renderToReadableStream.
*
* This function should never be called at runtime on the client.
* It exists only to provide types for bundler imports in client bundles.
* The real implementation only runs inside RSC context (server functions).
*/
function renderToReadableStream(_node) {
	throw new Error("renderToReadableStream cannot be called on the client. This function should only be called inside RSC context (server functions).");
}
//#endregion
export { renderToReadableStream };

//# sourceMappingURL=flight.stub.js.map