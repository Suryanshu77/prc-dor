import { createIsomorphicFn } from "@tanstack/start-fn-stubs";
import { getStartContext } from "@tanstack/start-storage-context";
//#region src/getRouterInstance.ts
var getRouterInstance = createIsomorphicFn().client(() => window.__TSR_ROUTER__).server(() => getStartContext().getRouter());
//#endregion
export { getRouterInstance };

//# sourceMappingURL=getRouterInstance.js.map