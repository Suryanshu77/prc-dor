import { StartServer } from "./StartServer.js";
import { jsx } from "react/jsx-runtime";
import { defineHandlerCallback, renderRouterToStream } from "@tanstack/react-router/ssr/server";
//#region src/defaultStreamHandler.tsx
var defaultStreamHandler = defineHandlerCallback(({ request, router, responseHeaders }) => renderRouterToStream({
	request,
	router,
	responseHeaders,
	children: /* @__PURE__ */ jsx(StartServer, { router })
}));
//#endregion
export { defaultStreamHandler };

//# sourceMappingURL=defaultStreamHandler.js.map