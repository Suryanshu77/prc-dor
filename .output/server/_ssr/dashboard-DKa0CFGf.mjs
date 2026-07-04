import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { n as useAuth } from "./auth-C9iSOyPB.mjs";
import { t as PlayerAvatar } from "./PlayerAvatar-DWQl0Nc4.mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { A as CircleAlert, S as CalendarClock, i as Trophy, k as CircleCheck, n as Vote, r as Users } from "../_libs/lucide-react.mjs";
import { t as trophy_hero_default } from "./trophy-hero-CljfJabd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dashboard-DKa0CFGf.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Dashboard() {
	const { user } = useAuth();
	const profileQ = useQuery({
		queryKey: ["profile", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
			return data;
		}
	});
	const periodQ = useQuery({
		queryKey: ["active-period"],
		queryFn: async () => {
			const { data } = await supabase.from("voting_periods").select("*").eq("is_active", true).order("year", { ascending: false }).limit(1).maybeSingle();
			return data;
		}
	});
	const statsQ = useQuery({
		queryKey: ["dashboard-stats", periodQ.data?.id],
		enabled: !!periodQ.data,
		queryFn: async () => {
			const [players, stats, mine] = await Promise.all([
				supabase.from("profiles").select("id", {
					count: "exact",
					head: true
				}),
				supabase.rpc("get_period_vote_stats", { _period_id: periodQ.data.id }),
				supabase.rpc("has_voted_in_period", { _period_id: periodQ.data.id })
			]);
			const row = (stats.data ?? [])[0];
			return {
				playersCount: players.count ?? 0,
				voteCount: row?.vote_count ?? 0,
				votersCount: row?.voter_count ?? 0,
				hasVoted: mine.data === true
			};
		}
	});
	const profile = profileQ.data;
	const period = periodQ.data;
	const stats = statsQ.data;
	const completion = stats && stats.playersCount > 0 ? Math.round(stats.votersCount / stats.playersCount * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
						path: profile?.profile_image,
						name: profile?.full_name ?? "Player",
						className: "h-16 w-16",
						ring: true
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase tracking-[0.2em] text-muted-foreground",
							children: "Welcome back"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-display text-3xl",
							children: profile?.full_name?.split(" ")[0] ?? "Player"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-sm text-muted-foreground",
							children: [profile?.position ?? "—", profile?.jersey_number ? ` · #${profile.jersey_number}` : ""]
						})
					] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${stats?.hasVoted ? "border-[var(--gold)]/40 text-gold" : "border-destructive/40 text-destructive"}`,
					children: stats?.hasVoted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4" }), " Vote submitted"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "h-4 w-4" }), " Vote not submitted"] })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative overflow-hidden rounded-3xl glass-strong p-8 md:p-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--gold)] opacity-20 blur-3xl" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid items-center gap-8 md:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/30 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-gold",
							children: period?.title ?? "PRC D'or"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "font-display text-4xl leading-tight md:text-5xl",
							children: [
								"Who deserves the ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-gold-gradient",
									children: ["PRC D'or ", period?.year]
								}),
								"?"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-4 max-w-md text-muted-foreground",
							children: [
								"Voting is ",
								period?.is_active ? "live" : "closed",
								". Rank your top 10 players — your voice helps crown the season's best."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Countdown, { endsAt: period?.ends_at }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex gap-3",
							children: [!stats?.hasVoted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/vote",
								className: "rounded-md bg-gold-gradient px-5 py-2.5 font-medium text-background shadow-gold transition hover:opacity-90",
								children: "Cast your vote"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/results",
								className: "rounded-md bg-gold-gradient px-5 py-2.5 font-medium text-background shadow-gold transition hover:opacity-90",
								children: "See live results"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/players",
								className: "rounded-md border border-border px-5 py-2.5 font-medium hover:bg-secondary",
								children: "View players"
							})]
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative hidden md:block",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: trophy_hero_default,
							alt: "Trophy",
							width: 600,
							height: 400,
							loading: "lazy",
							className: "animate-float mx-auto max-h-[300px] w-auto rounded-2xl object-contain"
						})
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						icon: Users,
						label: "Registered players",
						value: stats?.playersCount ?? 0
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						icon: Vote,
						label: "Votes submitted",
						value: stats?.voteCount ?? 0
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						icon: Trophy,
						label: "Voting completion",
						value: `${completion}%`,
						sub: `${stats?.votersCount ?? 0} of ${stats?.playersCount ?? 0} voters`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						icon: CalendarClock,
						label: "Days remaining",
						value: daysRemaining(period?.ends_at)
					})
				]
			})
		]
	});
}
function StatCard({ icon: Icon, label, value, sub }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass rounded-2xl p-5 transition hover:shadow-gold",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs uppercase tracking-[0.18em] text-muted-foreground",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4 text-gold" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "font-display text-3xl text-gold-gradient",
				children: value
			}),
			sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-1 text-xs text-muted-foreground",
				children: sub
			})
		]
	});
}
function daysRemaining(end) {
	if (!end) return "—";
	const diff = new Date(end).getTime() - Date.now();
	if (diff <= 0) return "Closed";
	return Math.ceil(diff / (1e3 * 60 * 60 * 24));
}
function Countdown({ endsAt }) {
	const [now, setNow] = (0, import_react.useState)(Date.now());
	(0, import_react.useEffect)(() => {
		const t = setInterval(() => setNow(Date.now()), 1e3);
		return () => clearInterval(t);
	}, []);
	if (!endsAt) return null;
	const diff = Math.max(0, new Date(endsAt).getTime() - now);
	const d = Math.floor(diff / 864e5);
	const h = Math.floor(diff % 864e5 / 36e5);
	const m = Math.floor(diff % 36e5 / 6e4);
	const s = Math.floor(diff % 6e4 / 1e3);
	const Box = ({ v, l }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border border-border bg-secondary/50 px-3 py-2 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "font-display text-2xl text-gold-gradient",
			children: v.toString().padStart(2, "0")
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[10px] uppercase tracking-widest text-muted-foreground",
			children: l
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-5 grid max-w-sm grid-cols-4 gap-2",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				v: d,
				l: "days"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				v: h,
				l: "hrs"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				v: m,
				l: "min"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Box, {
				v: s,
				l: "sec"
			})
		]
	});
}
//#endregion
export { Dashboard as component };
