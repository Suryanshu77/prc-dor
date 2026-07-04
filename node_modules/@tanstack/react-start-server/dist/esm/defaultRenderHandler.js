import { StartServer } from "./StartServer.js";
import { jsx } from "react/jsx-runtime";
import { defineHandlerCallback, renderRouterToString } from "@tanstack/react-router/ssr/server";
//#region src/defaultRenderHandler.tsx
var defaultRenderHandler = defineHandlerCallback(({ router, responseHeaders }) => renderRouterToString({
	router,
	responseHeaders,
	children: /* @__PURE__ */ jsx(StartServer, { router })
}));
//#endregion
export { defaultRenderHandler };

//# sourceMappingURL=defaultRenderHandler.js.map