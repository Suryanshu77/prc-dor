import { createIsomorphicFn } from "@tanstack/start-fn-stubs";
import { getStartContext } from "@tanstack/start-storage-context";
//#region src/getGlobalStartContext.ts
var getGlobalStartContext = createIsomorphicFn().client(() => void 0).server(() => {
	const context = getStartContext().contextAfterGlobalMiddlewares;
	if (!context) throw new Error(`Global context not set yet, you are calling getGlobalStartContext() before the global middlewares are applied.`);
	return context;
});
//#endregion
export { getGlobalStartContext };

//# sourceMappingURL=getGlobalStartContext.js.map