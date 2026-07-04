import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { t as PlayerAvatar } from "./PlayerAvatar-DWQl0Nc4.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { C as Award, g as Hash, i as Trophy, p as MapPin, w as ArrowLeft } from "../_libs/lucide-react.mjs";
import { t as Route } from "./players._id-C4qeqXAS.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/players._id-BVvLBJp3.js
var import_jsx_runtime = require_jsx_runtime();
function PlayerPage() {
	const { id } = Route.useParams();
	const profileQ = useQuery({
		queryKey: ["profile", id],
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
			return data;
		}
	});
	const resultsQ = useQuery({
		queryKey: ["player-results", id],
		queryFn: async () => {
			const { data } = await supabase.from("player_results").select("*").order("total_points", { ascending: false });
			return data ?? [];
		}
	});
	const p = profileQ.data;
	const all = resultsQ.data ?? [];
	const me = all.find((r) => r.id === id);
	const rank = me ? all.findIndex((r) => r.id === id) + 1 : null;
	if (profileQ.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-center py-20 text-muted-foreground",
		children: "Loading…"
	});
	if (!p) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-center py-20",
		children: "Player not found."
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: "/players",
				className: "inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), " All players"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative overflow-hidden rounded-3xl glass-strong p-8 md:p-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--gold)] opacity-15 blur-3xl" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid items-center gap-8 md:grid-cols-[auto_1fr]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
						path: p.profile_image,
						name: p.full_name,
						className: "h-40 w-40",
						ring: true
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase tracking-[0.2em] text-gold",
							children: "PRC D'or Player"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-4xl md:text-5xl",
							children: p.full_name
						}),
						p.nickname && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-1 text-lg text-muted-foreground",
							children: [
								"\"",
								p.nickname,
								"\""
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex flex-wrap gap-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pill, {
									icon: MapPin,
									children: p.position ?? "—"
								}),
								p.jersey_number && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Pill, {
									icon: Hash,
									children: ["#", p.jersey_number]
								}),
								p.age && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Pill, { children: [p.age, " yrs"] })
							]
						})
					] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: Trophy,
						label: "Current rank",
						value: rank ? `#${rank}` : "—"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: Award,
						label: "Total points",
						value: me?.total_points ?? 0
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
						icon: Trophy,
						label: "#1 votes",
						value: me?.first_place_votes ?? 0
					})
				]
			})
		]
	});
}
function Pill({ icon: Icon, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-muted-foreground",
		children: [
			Icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5" }),
			" ",
			children
		]
	});
}
function Stat({ icon: Icon, label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass rounded-2xl p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-xs uppercase tracking-[0.18em] text-muted-foreground",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4 text-gold" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-display text-3xl text-gold-gradient",
			children: value
		})]
	});
}
//#endregion
export { PlayerPage as component };
