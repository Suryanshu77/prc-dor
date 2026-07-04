import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as useAuth } from "./auth-C9iSOyPB.mjs";
import { P as Navigate, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { E as Sparkles, i as Trophy, n as Vote, r as Users } from "../_libs/lucide-react.mjs";
import { t as trophy_hero_default } from "./trophy-hero-CljfJabd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-aKXuZE6U.js
var import_jsx_runtime = require_jsx_runtime();
function Landing() {
	const { user, loading } = useAuth();
	if (loading) return null;
	if (user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/dashboard" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative min-h-screen overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none absolute inset-0 -z-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[var(--gold)] opacity-10 blur-3xl" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
				className: "mx-auto flex max-w-7xl items-center justify-between px-6 py-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "h-5 w-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-display text-lg text-gold-gradient",
						children: "PRC D'or"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[10px] uppercase tracking-[0.25em] text-muted-foreground",
						children: "Est. 2024"
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth",
						search: { mode: "login" },
						className: "rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground",
						children: "Sign in"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/auth",
						search: { mode: "signup" },
						className: "rounded-md bg-gold-gradient px-4 py-2 text-sm font-medium text-background shadow-gold transition hover:opacity-90",
						children: "Join the awards"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mx-auto grid max-w-7xl items-center gap-12 px-6 py-12 md:grid-cols-2 md:py-24",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "animate-fade-up",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-gold",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }), " PRC D'or 2026"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "font-display text-5xl leading-tight text-foreground md:text-7xl",
							children: [
								"Who deserves the ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-gold-gradient",
									children: "PRC D'or"
								}),
								"?"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-6 max-w-lg text-lg text-muted-foreground",
							children: "The annual football community award of the PRC society. Sign up, rank your top ten, and crown the year's best player among 30+ legends of the pitch."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-8 flex flex-wrap gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/auth",
								search: { mode: "signup" },
								className: "rounded-md bg-gold-gradient px-6 py-3 font-medium text-background shadow-gold transition hover:opacity-90",
								children: "Create your player profile"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/auth",
								search: { mode: "login" },
								className: "rounded-md border border-border px-6 py-3 font-medium text-foreground hover:bg-secondary",
								children: "I already have an account"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-10 grid grid-cols-3 gap-4 text-sm",
							children: [
								{
									icon: Users,
									label: "30+ players"
								},
								{
									icon: Vote,
									label: "Top 10 ranking"
								},
								{
									icon: Trophy,
									label: "1 winner crowned"
								}
							].map(({ icon: Icon, label }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "glass rounded-xl p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "mb-2 h-5 w-5 text-gold" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-foreground/90",
									children: label
								})]
							}, label))
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 -z-10 rounded-full bg-[var(--gold)] opacity-20 blur-3xl" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: trophy_hero_default,
						alt: "Golden football trophy",
						width: 1536,
						height: 1024,
						className: "animate-float mx-auto max-h-[560px] w-auto rounded-2xl object-contain"
					})]
				})]
			})
		]
	});
}
//#endregion
export { Landing as component };
