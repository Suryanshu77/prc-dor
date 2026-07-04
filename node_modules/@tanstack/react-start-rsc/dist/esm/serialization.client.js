import { createCompositeFromStream, createRenderableFromStream } from "./createServerComponentFromStream.js";
import { createSerializationAdapter } from "@tanstack/react-router";
import { setupRscHmr } from "virtual:tanstack-rsc-hmr";
//#region src/serialization.client.ts
if (process.env.NODE_ENV === "development") setupRscHmr();
var adapter = createSerializationAdapter({
	key: "$RSC",
	test: (_value) => false,
	toSerializable: () => {
		throw new Error("RSC cannot be serialized on client");
	},
	fromSerializable: (value) => {
		const options = {
			cssHrefs: value.cssHrefs,
			jsPreloads: value.jsPreloads
		};
		if (value.kind === "renderable") return createRenderableFromStream(value.stream, options);
		return createCompositeFromStream(value.stream, {
			slotUsagesStream: value.slotUsagesStream,
			...options
		});
	}
});
var rscSerializationAdapter = () => [adapter];
//#endregion
export { rscSerializationAdapter };

//# sourceMappingURL=serialization.client.js.map