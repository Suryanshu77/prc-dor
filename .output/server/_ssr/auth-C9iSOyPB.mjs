import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-C9iSOyPB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Ctx = (0, import_react.createContext)({
	user: null,
	session: null,
	isAdmin: false,
	loading: true,
	signOut: async () => {}
});
function AuthProvider({ children }) {
	const [session, setSession] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [isAdmin, setIsAdmin] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
			setSession(s);
			if (s?.user) setTimeout(() => {
				supabase.from("user_roles").select("role").eq("user_id", s.user.id).then(({ data }) => {
					setIsAdmin((data ?? []).some((r) => r.role === "admin"));
				});
			}, 0);
			else setIsAdmin(false);
		});
		supabase.auth.getSession().then(({ data }) => {
			setSession(data.session);
			setLoading(false);
			if (data.session?.user) supabase.from("user_roles").select("role").eq("user_id", data.session.user.id).then(({ data: roles }) => {
				setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
			});
		});
		return () => sub.subscription.unsubscribe();
	}, []);
	const signOut = async () => {
		await supabase.auth.signOut();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ctx.Provider, {
		value: {
			user: session?.user ?? null,
			session,
			isAdmin,
			loading,
			signOut
		},
		children
	});
}
var useAuth = () => (0, import_react.useContext)(Ctx);
//#endregion
export { useAuth as n, AuthProvider as t };
