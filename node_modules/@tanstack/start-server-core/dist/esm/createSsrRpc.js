import { getServerFnById } from "./getServerFnById.js";
import { TSS_SERVER_FUNCTION } from "@tanstack/start-client-core";
//#region src/createSsrRpc.ts
var createSsrRpc = (functionId) => {
	const url = process.env.TSS_SERVER_FN_BASE + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
export { createSsrRpc };

//# sourceMappingURL=createSsrRpc.js.map