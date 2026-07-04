import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { n as useAuth } from "./auth-C9iSOyPB.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as PlayerAvatar } from "./PlayerAvatar-DWQl0Nc4.mjs";
import { I as useRouter, f as Outlet, g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { D as House, O as CircleUserRound, f as Menu, i as Trophy, j as ChartColumn, m as LogOut, n as Vote, o as Shield, r as Users, v as Crown } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/route-C5QLybBt.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var NAV = [
	{
		to: "/dashboard",
		label: "Dashboard",
		icon: House
	},
	{
		to: "/players",
		label: "Players",
		icon: Users
	},
	{
		to: "/vote",
		label: "Vote",
		icon: Vote
	},
	{
		to: "/results",
		label: "Results",
		icon: Trophy
	},
	{
		to: "/analytics",
		label: "Analytics",
		icon: ChartColumn
	},
	{
		to: "/hall-of-fame",
		label: "Hall of Fame",
		icon: Crown
	},
	{
		to: "/admin",
		label: "Admin",
		icon: Shield,
		adminOnly: true
	}
];
function AppShell({ children }) {
	const { user, isAdmin, signOut } = useAuth();
	const [open, setOpen] = (0, import_react.useState)(false);
	const router = useRouter();
	const meta = user?.user_metadata ?? {};
	const displayName = meta.full_name ?? user?.email ?? "Player";
	const visible = NAV.filter((n) => !n.adminOnly || isAdmin);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("aside", {
				className: cn("fixed inset-y-0 left-0 z-40 w-64 transform glass-strong border-r transition-transform md:relative md:translate-x-0", open ? "translate-x-0" : "-translate-x-full"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex h-full flex-col p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/dashboard",
							className: "mb-8 flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex h-10 w-10 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "h-5 w-5" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-display text-lg text-gold-gradient",
								children: "PRC D'or"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] uppercase tracking-[0.2em] text-muted-foreground",
								children: "Football Awards"
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
							className: "flex-1 space-y-1",
							children: visible.map((item) => {
								const Icon = item.icon;
								const active = router.state.location.pathname.startsWith(item.to);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: item.to,
									onClick: () => setOpen(false),
									className: cn("group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all", active ? "bg-accent text-accent-foreground shadow-[inset_0_0_0_1px_var(--gold)]" : "text-muted-foreground hover:bg-secondary hover:text-foreground"),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }), item.label]
								}, item.to);
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2 border-t border-border/50 pt-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/profile",
								onClick: () => setOpen(false),
								className: "flex items-center gap-3 rounded-lg p-2 hover:bg-secondary",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
										path: meta.profile_image,
										name: displayName,
										className: "h-9 w-9"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "truncate text-sm font-medium",
											children: displayName
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "truncate text-xs text-muted-foreground",
											children: isAdmin ? "Administrator" : "Player"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleUserRound, { className: "h-4 w-4 text-muted-foreground" })
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "ghost",
								size: "sm",
								className: "w-full justify-start text-muted-foreground",
								onClick: () => signOut(),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "mr-2 h-4 w-4" }), " Sign out"]
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-border/50 glass-strong px-4 py-3 md:hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setOpen((o) => !o),
						className: "rounded-md p-2 hover:bg-secondary",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-display text-base text-gold-gradient",
						children: "PRC D'or"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
						path: meta.profile_image,
						name: displayName,
						className: "h-8 w-8"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "flex-1 px-4 pb-12 pt-20 md:px-10 md:pt-10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mx-auto w-full max-w-7xl",
					children
				})
			})
		]
	});
}
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}) });
//#endregion
export { SplitComponent as component };
