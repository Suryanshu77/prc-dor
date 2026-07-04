import { TSS_SERVER_FUNCTION } from "../constants.js";
import { getStartOptions } from "../getStartOptions.js";
import { serverFnFetcher } from "./serverFnFetcher.js";
//#region src/client-rpc/createClientRpc.ts
function createClientRpc(functionId) {
	const url = process.env.TSS_SERVER_FN_BASE + functionId;
	const serverFnMeta = { id: functionId };
	const clientFn = (...args) => {
		const startFetch = getStartOptions()?.serverFns?.fetch;
		return serverFnFetcher(url, args, startFetch ?? fetch);
	};
	return Object.assign(clientFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
}
//#endregion
export { createClientRpc };

//# sourceMappingURL=createClientRpc.js.map