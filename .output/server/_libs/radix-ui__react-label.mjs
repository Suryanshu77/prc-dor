import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime, O as Primitive } from "./@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "./dnd-kit__accessibility+react.mjs";
//#region node_modules/@radix-ui/react-label/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var NAME = "Label";
var Label = import_react.forwardRef((props, forwardedRef) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Primitive.label, {
		...props,
		ref: forwardedRef,
		onMouseDown: (event) => {
			if (event.target.closest("button, input, select, textarea")) return;
			props.onMouseDown?.(event);
			if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
		}
	});
});
Label.displayName = NAME;
var Root = Label;
//#endregion
export { Root as t };
