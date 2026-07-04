import { hydrateStart } from "./hydrateStart.js";
import { Await, RouterProvider } from "@tanstack/react-router";
import { jsx } from "react/jsx-runtime";
//#region src/StartClient.tsx
var hydrationPromise;
function StartClient() {
	if (!hydrationPromise) hydrationPromise = hydrateStart();
	return /* @__PURE__ */ jsx(Await, {
		promise: hydrationPromise,
		children: (router) => /* @__PURE__ */ jsx(RouterProvider, { router })
	});
}
//#endregion
export { StartClient };

//# sourceMappingURL=StartClient.js.map