import { RENDERABLE_RSC, SERVER_COMPONENT_STREAM } from "./ServerComponentTypes.js";
import { ReplayableStream } from "./ReplayableStream.js";
import { createRscCssEnvelope } from "./rscCssEnvelope.js";
import { renderToReadableStream } from "virtual:tanstack-rsc-runtime";
import { getRequest } from "@tanstack/start-server-core";
import { getStartContext } from "@tanstack/start-storage-context";
//#region src/renderServerComponent.ts
/**
* Renders a React element to an RSC Flight stream.
*
* Returns a "renderable proxy" that can be:
* - Rendered directly as `{data}` in JSX
* - Accessed for nested selections: `{data.foo.bar.Hello}`
*
* No slot support - for slots use `createCompositeComponent`.
*
* @example
* ```tsx
* // In a loader or server function
* const data = await renderServerComponent(<MyServerComponent foo="bar" />)
*
* // In the route component
* return (
*   <div>
*     {data}
*     {data.sidebar.Menu}
*   </div>
* )
* ```
*/
async function renderServerComponent(node, options) {
	const flightStream = renderToReadableStream(createRscCssEnvelope(node, options));
	const isRouterRequest = getStartContext({ throwIfNotFound: false })?.handlerType === "router";
	const ssrHandler = globalThis.__RSC_SSR__;
	if (isRouterRequest && ssrHandler) {
		const signal = getRequest().signal;
		const stream = new ReplayableStream(flightStream, { signal });
		const decoded = await ssrHandler.decode(stream);
		return ssrHandler.createRenderableProxy(stream, decoded);
	}
	return createRenderableHandle(flightStream);
}
/**
* Creates a renderable handle for server function responses.
* Tagged with RENDERABLE_RSC for the serialization adapter.
*/
function createRenderableHandle(flightStream) {
	const streamWrapper = { createReplayStream: () => flightStream };
	const stub = function RenderableRscStub() {
		throw new Error("Renderable RSC from server function cannot be rendered on server. It should be serialized and sent to the client.");
	};
	stub[SERVER_COMPONENT_STREAM] = streamWrapper;
	stub[RENDERABLE_RSC] = true;
	return stub;
}
//#endregion
export { renderServerComponent };

//# sourceMappingURL=renderServerComponent.js.map