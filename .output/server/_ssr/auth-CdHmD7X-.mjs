import { m as createFileRoute, p as lazyRouteComponent } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as objectType, n as enumType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-CdHmD7X-.js
var $$splitComponentImporter = () => import("./auth-DBdsmCrb.mjs");
var searchSchema = objectType({ mode: enumType(["login", "signup"]).optional() });
var Route = createFileRoute("/auth")({
	validateSearch: searchSchema,
	head: () => ({ meta: [{ title: "Sign in — PRC D'or" }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
