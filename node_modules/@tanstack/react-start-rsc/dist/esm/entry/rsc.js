import { renderToReadableStream } from "virtual:tanstack-rsc-runtime";
import { getServerFnById } from "#tanstack-start-server-fn-resolver";
//#region src/entry/rsc.tsx
/**
* Shared RSC (React Server Components) entry point.
*
* This file exports the functions needed for the active RSC environment:
* - getServerFnById: Resolves server functions by their encoded ID
* - render: Renders a React node to an RSC Flight stream
*/
/**
* Renders a React node to an RSC Flight stream.
* Used internally for streaming server component output.
*/
function render(node) {
	return renderToReadableStream(node);
}
//#endregion
export { getServerFnById, render };

//# sourceMappingURL=rsc.js.map