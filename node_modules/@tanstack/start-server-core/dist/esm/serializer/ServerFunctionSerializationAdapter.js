import { getServerFnById } from "../getServerFnById.js";
import { TSS_SERVER_FUNCTION } from "@tanstack/start-client-core";
import { createSerializationAdapter } from "@tanstack/router-core";
//#region src/serializer/ServerFunctionSerializationAdapter.ts
var ServerFunctionSerializationAdapter = createSerializationAdapter({
	key: "$TSS/serverfn",
	test: (v) => {
		if (typeof v !== "function") return false;
		if (!(TSS_SERVER_FUNCTION in v)) return false;
		return !!v[TSS_SERVER_FUNCTION];
	},
	toSerializable: ({ serverFnMeta }) => ({ functionId: serverFnMeta.id }),
	fromSerializable: ({ functionId }) => {
		const fn = async (opts, signal) => {
			return (await (await getServerFnById(functionId, { origin: "client" }))(opts ?? {}, signal)).result;
		};
		return fn;
	}
});
//#endregion
export { ServerFunctionSerializationAdapter };

//# sourceMappingURL=ServerFunctionSerializationAdapter.js.map