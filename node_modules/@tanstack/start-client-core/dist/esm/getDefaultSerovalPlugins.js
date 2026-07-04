import { getStartOptions } from "./getStartOptions.js";
import { defaultSerovalPlugins, makeSerovalPlugin } from "@tanstack/router-core";
//#region src/getDefaultSerovalPlugins.ts
function getDefaultSerovalPlugins() {
	return [...(getStartOptions()?.serializationAdapters)?.map(makeSerovalPlugin) ?? [], ...defaultSerovalPlugins];
}
//#endregion
export { getDefaultSerovalPlugins };

//# sourceMappingURL=getDefaultSerovalPlugins.js.map