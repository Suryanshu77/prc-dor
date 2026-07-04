import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as PlayerAvatar } from "./PlayerAvatar-DWQl0Nc4.mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { c as Share2, i as Trophy } from "../_libs/lucide-react.mjs";
import { t as confetti_module_default } from "../_libs/canvas-confetti.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/results-wST3Xw2I.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ResultsPage() {
	const periodQ = useQuery({
		queryKey: ["active-period"],
		queryFn: async () => {
			const { data } = await supabase.from("voting_periods").select("results_published,title").order("year", { ascending: false }).limit(1).single();
			return data;
		}
	});
	const ranked = (useQuery({
		queryKey: ["leaderboard"],
		queryFn: async () => {
			const { data } = await supabase.from("player_results").select("*").order("total_points", { ascending: false }).order("first_place_votes", { ascending: false });
			return data ?? [];
		},
		refetchInterval: 3e4
	}).data ?? []).map((r) => ({
		...r,
		total_points: r.total_points ?? 0,
		first_place_votes: r.first_place_votes ?? 0
	})).filter((r) => r.total_points > 0);
	const top3 = ranked.slice(0, 3);
	const published = periodQ.data?.results_published ?? false;
	(0, import_react.useEffect)(() => {
		if (top3.length > 0 && top3[0].total_points > 0) confetti_module_default({
			particleCount: 80,
			spread: 70,
			origin: { y: .3 },
			colors: [
				"#D4AF37",
				"#FFD700",
				"#fff"
			]
		});
	}, [top3.length]);
	async function share() {
		const text = top3.length ? `PRC D'or leader: ${top3[0].full_name} with ${top3[0].total_points} points 🏆` : "PRC D'or — vote now";
		if (navigator.share) try {
			await navigator.share({
				title: "PRC D'or",
				text,
				url: window.location.href
			});
		} catch {}
		else {
			await navigator.clipboard.writeText(`${text} — ${window.location.href}`);
			toast.success("Copied to clipboard");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-10",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "flex flex-wrap items-end justify-between gap-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs uppercase tracking-[0.2em] text-gold",
				children: "Live leaderboard"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "PRC D'or Standings"
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				variant: "outline",
				onClick: share,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Share2, { className: "mr-2 h-4 w-4" }), " Share"]
			})]
		}), !published ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass-strong rounded-2xl p-14 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mb-6 text-6xl",
					children: "🏆"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-3xl",
					children: "Results have not been announced yet"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 text-muted-foreground",
					children: "Voting has ended."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground",
					children: "Please wait for the official PRC D'OR announcement."
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid items-end gap-4 md:grid-cols-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Podium, {
					player: top3[1],
					place: 2,
					height: "h-44"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Podium, {
					player: top3[0],
					place: 1,
					height: "h-56",
					winner: true
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Podium, {
					player: top3[2],
					place: 3,
					height: "h-36"
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "glass-strong overflow-hidden rounded-2xl",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-border text-left text-xs uppercase tracking-[0.15em] text-muted-foreground",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-3",
							children: "Rank"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-3",
							children: "Player"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-3",
							children: "Position"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-3 text-right",
							children: "#1 votes"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-4 py-3 text-right",
							children: "Points"
						})
					]
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: ranked.map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-b border-border/30 transition hover:bg-secondary/30",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3 font-display text-gold",
							children: i + 1
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
									path: r.profile_image,
									name: r.full_name ?? "",
									className: "h-9 w-9"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: r.full_name
								}), r.nickname && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-xs text-muted-foreground",
									children: [
										"\"",
										r.nickname,
										"\""
									]
								})] })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3 text-muted-foreground",
							children: r.position
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3 text-right",
							children: r.first_place_votes
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3 text-right font-display text-base text-gold-gradient",
							children: r.total_points
						})
					]
				}, r.id)) })]
			})
		})] })]
	});
}
function Podium({ player, place, height, winner }) {
	if (!player) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col items-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mb-3 text-3xl",
				children: place === 1 ? "🥇" : place === 2 ? "🥈" : "🥉"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
				path: player.profile_image,
				name: player.full_name,
				className: winner ? "h-28 w-28" : "h-20 w-20",
				ring: winner
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-display text-lg",
					children: player.full_name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted-foreground",
					children: player.position
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `mt-4 w-full ${height} rounded-t-2xl ${winner ? "bg-gold-gradient" : "bg-secondary"} flex items-center justify-center shadow-gold`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `text-center ${winner ? "text-background" : "text-foreground"}`,
					children: [
						winner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "mx-auto mb-1 h-6 w-6" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-display text-3xl",
							children: player.total_points
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[10px] uppercase tracking-widest opacity-80",
							children: "points"
						})
					]
				})
			})
		]
	});
}
//#endregion
export { ResultsPage as component };
