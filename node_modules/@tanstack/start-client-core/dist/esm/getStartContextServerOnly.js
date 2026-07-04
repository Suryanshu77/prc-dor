import { createServerOnlyFn } from "@tanstack/start-fn-stubs";
import { getStartContext } from "@tanstack/start-storage-context";
//#region src/getStartContextServerOnly.ts
var getStartContextServerOnly = createServerOnlyFn(getStartContext);
//#endregion
export { getStartContextServerOnly };

//# sourceMappingURL=getStartContextServerOnly.js.map