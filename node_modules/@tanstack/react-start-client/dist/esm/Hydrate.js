"use client";
import { jsx } from "react/jsx-runtime";
import * as React from "react";
import { isServer } from "@tanstack/router-core/isServer";
//#region src/Hydrate.tsx
var dynamicType = "dynamic";
var hydrateIdAttribute = "data-ts-hydrate-id";
var hydrateWhenAttribute = "data-ts-hydrate-when";
/* @__NO_SIDE_EFFECTS__ */
function ServerDynamicHydrate(props) {
	const internalProps = props;
	const reactId = React.useId();
	const id = internalProps.h ? `${internalProps.h}${reactId}` : reactId;
	return /* @__PURE__ */ jsx("div", {
		[hydrateIdAttribute]: id,
		[hydrateWhenAttribute]: dynamicType,
		children: /* @__PURE__ */ jsx(React.Suspense, {
			fallback: props.fallback ?? null,
			children: props.children
		})
	});
}
/* @__NO_SIDE_EFFECTS__ */
function Hydrate(props) {
	if (typeof props.when === "function") {
		if (isServer ?? typeof window === "undefined") return /* @__PURE__ */ jsx(ServerDynamicHydrate, { ...props });
		return props.when()._h(props);
	}
	return props.when._h(props);
}
//#endregion
export { Hydrate };

//# sourceMappingURL=Hydrate.js.map