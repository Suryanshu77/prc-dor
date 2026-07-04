import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime } from "./@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "./dnd-kit__accessibility+react.mjs";
//#region node_modules/@radix-ui/react-direction/dist/index.mjs
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
require_jsx_runtime();
var DirectionContext = import_react.createContext(void 0);
function useDirection(localDir) {
	const globalDir = import_react.useContext(DirectionContext);
	return localDir || globalDir || "ltr";
}
//#endregion
export { useDirection as t };
