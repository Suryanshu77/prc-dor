import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PlayerAvatar-DWQl0Nc4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var cache = /* @__PURE__ */ new Map();
async function getAvatarUrl(path) {
	if (!path) return null;
	if (path.startsWith("http")) return path;
	const cached = cache.get(path);
	if (cached && cached.expires > Date.now()) return cached.url;
	const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
	if (error || !data) return null;
	cache.set(path, {
		url: data.signedUrl,
		expires: Date.now() + 3300 * 1e3
	});
	return data.signedUrl;
}
function avatarInitials(name) {
	return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}
function PlayerAvatar({ path, name, className, ring }) {
	const [url, setUrl] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let alive = true;
		getAvatarUrl(path).then((u) => alive && setUrl(u));
		return () => {
			alive = false;
		};
	}, [path]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("relative inline-flex items-center justify-center overflow-hidden rounded-full bg-secondary text-foreground/80 font-display font-semibold", ring && "ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-background", className),
		children: url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
			src: url,
			alt: name,
			className: "h-full w-full object-cover"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-sm",
			children: avatarInitials(name)
		})
	});
}
//#endregion
export { PlayerAvatar as t };
