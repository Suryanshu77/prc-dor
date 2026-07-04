"use client";
import { useSlotContext } from "./SlotContext.js";
import { Fragment, jsx } from "react/jsx-runtime";
//#region src/ClientSlot.tsx
function ClientSlot({ slot, args }) {
	const ctx = useSlotContext();
	if (!ctx) throw new Error("ClientSlot must be rendered within SlotProvider");
	const impl = ctx.implementations[slot];
	if (impl === void 0) {
		if (ctx.strict) throw new Error(`Missing slot implementation for "${slot}"`);
		return null;
	}
	if (typeof impl !== "function") return /* @__PURE__ */ jsx(Fragment, { children: impl });
	return /* @__PURE__ */ jsx(Fragment, { children: impl(...args) });
}
//#endregion
export { ClientSlot };

//# sourceMappingURL=ClientSlot.js.map