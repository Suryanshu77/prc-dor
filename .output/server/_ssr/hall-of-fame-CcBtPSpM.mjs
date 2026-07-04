import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { t as PlayerAvatar } from "./PlayerAvatar-DWQl0Nc4.mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { v as Crown } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/hall-of-fame-CcBtPSpM.js
var import_jsx_runtime = require_jsx_runtime();
function HallOfFame() {
	const entries = useQuery({
		queryKey: ["hof"],
		queryFn: async () => {
			const { data } = await supabase.from("hall_of_fame").select("*, winner:winner_id(profile_image, full_name, position)").order("year", { ascending: false });
			return data ?? [];
		}
	}).data ?? [];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs uppercase tracking-[0.2em] text-gold",
					children: "Hall of Fame"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-5xl text-gold-gradient",
					children: "Legends of PRC"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-muted-foreground",
					children: "Every PRC D'or winner, immortalised."
				})
			]
		}), entries.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "rounded-2xl glass-strong p-12 text-center text-muted-foreground",
			children: "No winners crowned yet. The first chapter is about to be written."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-6 md:grid-cols-2 lg:grid-cols-3",
			children: entries.map((e) => {
				const w = e.winner;
				const img = w?.profile_image ?? e.winner_image;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative overflow-hidden rounded-2xl glass-strong p-8 text-center shadow-gold transition hover:-translate-y-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[var(--gold)] opacity-20 blur-3xl" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "mx-auto h-8 w-8 text-gold animate-float" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 font-display text-4xl text-gold-gradient",
							children: e.year
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col items-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
									path: img,
									name: e.winner_name,
									className: "h-24 w-24",
									ring: true
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-3 font-display text-xl",
									children: e.winner_name
								}),
								w?.position && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: w.position
								}),
								e.total_points && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 text-sm text-gold",
									children: [e.total_points, " points"]
								}),
								e.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 max-w-xs text-xs italic text-muted-foreground",
									children: e.notes
								})
							]
						})
					]
				}, e.id);
			})
		})]
	});
}
//#endregion
export { HallOfFame as component };
