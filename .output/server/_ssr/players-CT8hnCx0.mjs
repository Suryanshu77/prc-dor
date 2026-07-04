import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as PlayerAvatar } from "./PlayerAvatar-DWQl0Nc4.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { l as Search } from "../_libs/lucide-react.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/players-CT8hnCx0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var POSITIONS = [
	"All",
	"Goalkeeper",
	"Defender",
	"Midfielder",
	"Winger",
	"Striker"
];
function PlayersPage() {
	const [q, setQ] = (0, import_react.useState)("");
	const [pos, setPos] = (0, import_react.useState)("All");
	const list = (useQuery({
		queryKey: ["players"],
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("id, full_name, nickname, position, jersey_number, profile_image").order("full_name");
			return data ?? [];
		}
	}).data ?? []).filter((p) => (pos === "All" || p.position === pos) && (q === "" || p.full_name.toLowerCase().includes(q.toLowerCase()) || (p.nickname ?? "").toLowerCase().includes(q.toLowerCase())));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-3xl",
				children: "The Squad"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-muted-foreground",
				children: "All registered PRC D'or contenders."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-1 min-w-[220px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Search players…",
						className: "pl-9",
						value: q,
						onChange: (e) => setQ(e.target.value)
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: pos,
					onValueChange: setPos,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
						className: "w-[180px]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: POSITIONS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: p,
						children: p
					}, p)) })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
				children: [list.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/players/$id",
					params: { id: p.id },
					className: "group glass rounded-2xl p-5 text-center transition hover:shadow-gold hover:-translate-y-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mx-auto mb-4 inline-block",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
								path: p.profile_image,
								name: p.full_name,
								className: "h-24 w-24",
								ring: true
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-display text-lg",
							children: p.full_name
						}),
						p.nickname && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted-foreground",
							children: [
								"\"",
								p.nickname,
								"\""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex items-center justify-center gap-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-secondary px-2.5 py-1 text-muted-foreground",
								children: p.position ?? "—"
							}), p.jersey_number && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "rounded-full bg-gold-gradient px-2.5 py-1 font-medium text-background",
								children: ["#", p.jersey_number]
							})]
						})
					]
				}, p.id)), list.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "col-span-full rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground",
					children: "No players match your search."
				})]
			})
		]
	});
}
//#endregion
export { PlayersPage as component };
