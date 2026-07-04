import { TSS_SERVER_FUNCTION } from "../constants.js";
import { createClientRpc } from "../client-rpc/createClientRpc.js";
import { createSerializationAdapter } from "@tanstack/router-core";
//#region src/client/ServerFunctionSerializationAdapter.ts
var ServerFunctionSerializationAdapter = createSerializationAdapter({
	key: "$TSS/serverfn",
	test: (v) => {
		if (typeof v !== "function") return false;
		if (!(TSS_SERVER_FUNCTION in v)) return false;
		return !!v[TSS_SERVER_FUNCTION];
	},
	toSerializable: ({ serverFnMeta }) => ({ functionId: serverFnMeta.id }),
	fromSerializable: ({ functionId }) => createClientRpc(functionId)
});
//#endregion
export { ServerFunctionSerializationAdapter };

//# sourceMappingURL=ServerFunctionSerializationAdapter.js.map