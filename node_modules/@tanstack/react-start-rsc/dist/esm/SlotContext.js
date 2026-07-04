"use client";
import { createContext, use } from "react";
import { jsx } from "react/jsx-runtime";
//#region src/SlotContext.tsx
var SlotContext = createContext(null);
/**
* Hook to access slot implementations from within ClientSlot.
*/
function useSlotContext() {
	return use(SlotContext);
}
/**
* SlotProvider - makes slot implementations available to ClientSlot components.
*
* Must wrap the decoded RSC content so that ClientSlot components can
* access their slot implementations via React Context.
*/
function SlotProvider({ implementations, strict, children }) {
	return /* @__PURE__ */ jsx(SlotContext, {
		value: {
			implementations,
			strict: strict ?? false
		},
		children
	});
}
//#endregion
export { SlotProvider, useSlotContext };

//# sourceMappingURL=SlotContext.js.map