import { createIsomorphicFn } from "@tanstack/start-fn-stubs";
import { getStartContext } from "@tanstack/start-storage-context";
//#region src/getStartOptions.ts
var getStartOptions = createIsomorphicFn().client(() => window.__TSS_START_OPTIONS__).server(() => getStartContext().startOptions);
//#endregion
export { getStartOptions };

//# sourceMappingURL=getStartOptions.js.map