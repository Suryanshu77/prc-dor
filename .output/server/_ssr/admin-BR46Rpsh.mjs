import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime, a as Overlay2, c as Title2, i as Description2, n as Cancel, o as Portal2, r as Content2, s as Root2, t as Action } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { n as useAuth } from "./auth-C9iSOyPB.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { n as buttonVariants, t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as PlayerAvatar } from "./PlayerAvatar-DWQl0Nc4.mjs";
import { P as Navigate, g as Link, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as Trash2, d as Plus, h as LayoutDashboard, o as Shield, s as ShieldCheck, u as RotateCcw, v as Crown } from "../_libs/lucide-react.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin-BR46Rpsh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var menu = [{
	title: "Dashboard",
	icon: LayoutDashboard,
	href: "/admin"
}];
function AdminSidebar() {
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "w-72 border-r border-border bg-card/40 backdrop-blur-xl min-h-screen",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "p-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-2xl font-bold text-gold",
				children: "PRC D'OR"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground mt-1",
				children: "Admin Control Panel"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
			className: "px-4 space-y-2",
			children: menu.map((item) => {
				const Icon = item.icon;
				const active = pathname === item.href;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: item.href,
					className: `flex items-center gap-3 rounded-xl px-4 py-3 transition-all
              ${active ? "bg-gold text-black font-semibold" : "hover:bg-accent"}`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { size: 18 }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: item.title })]
				}, item.href);
			})
		})]
	});
}
function AdminHeader() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "flex items-center justify-between border-b border-border px-8 py-5 bg-background/60 backdrop-blur-md",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-3xl font-display font-bold",
			children: "Admin Dashboard"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted-foreground mt-1",
			children: "Manage voting, players and platform settings"
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-5 w-5 text-gold" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium",
				children: "Administrator"
			})]
		})]
	});
}
function AdminLayout({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background flex",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminSidebar, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex-1 flex flex-col",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminHeader, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "p-8",
				children
			})]
		})]
	});
}
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = Switch$1.displayName;
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
var AlertDialog = Root2;
var AlertDialogPortal = Portal2;
var AlertDialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
	className: cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
AlertDialogOverlay.displayName = Overlay2.displayName;
var AlertDialogContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props
})] }));
AlertDialogContent.displayName = Content2.displayName;
var AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
AlertDialogHeader.displayName = "AlertDialogHeader";
var AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
AlertDialogFooter.displayName = "AlertDialogFooter";
var AlertDialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
	ref,
	className: cn("text-lg font-semibold", className),
	...props
}));
AlertDialogTitle.displayName = Title2.displayName;
var AlertDialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
AlertDialogDescription.displayName = Description2.displayName;
var AlertDialogAction = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
	ref,
	className: cn(buttonVariants(), className),
	...props
}));
AlertDialogAction.displayName = Action.displayName;
var AlertDialogCancel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
	ref,
	className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
	...props
}));
AlertDialogCancel.displayName = Cancel.displayName;
function AdminPage() {
	const { isAdmin, loading } = useAuth();
	if (loading) return null;
	if (!isAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/dashboard" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminLayout, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-10",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-3 w-3" }), "Admin"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "font-display text-4xl",
				children: "Control room"
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PeriodSection, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayersSection, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HallOfFameSection, {})
		]
	}) });
}
function PeriodSection() {
	const qc = useQueryClient();
	const periodsQ = useQuery({
		queryKey: ["periods"],
		queryFn: async () => {
			const { data } = await supabase.from("voting_periods").select("*").order("year", { ascending: false });
			return data ?? [];
		}
	});
	async function toggle(id, active) {
		if (active) await supabase.from("voting_periods").update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
		await supabase.from("voting_periods").update({ is_active: active }).eq("id", id);
		qc.invalidateQueries({ queryKey: ["periods"] });
		qc.invalidateQueries({ queryKey: ["active-period"] });
		toast.success("Updated");
	}
	async function resetVotes(id) {
		const { error } = await supabase.from("votes").delete().eq("voting_period_id", id);
		if (error) toast.error(error.message);
		else {
			toast.success("Votes reset");
			qc.invalidateQueries();
		}
	}
	async function declareWinner(periodId) {
		const { data } = await supabase.from("player_results").select("*").order("total_points", { ascending: false }).limit(1).maybeSingle();
		if (!data) return toast.error("No results yet");
		const period = periodsQ.data?.find((p) => p.id === periodId);
		if (!period) return;
		await supabase.from("voting_periods").update({
			winner_id: data.id,
			is_active: false,
			results_published: true
		}).eq("id", periodId);
		await supabase.from("hall_of_fame").upsert({
			year: period.year,
			winner_id: data.id,
			winner_name: data.full_name,
			winner_image: data.profile_image,
			total_points: data.total_points
		}, { onConflict: "year" });
		toast.success(`${data.full_name} crowned!`);
		qc.invalidateQueries();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "glass-strong rounded-2xl p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "mb-4 font-display text-2xl",
			children: "Voting periods"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: (periodsQ.data ?? []).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center gap-4 rounded-lg border border-border p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-display text-lg",
							children: p.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted-foreground",
							children: [
								"Year ",
								p.year,
								" · ends",
								" ",
								p.ends_at ? new Date(p.ends_at).toLocaleDateString() : "—"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-sm",
						children: ["Active", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: p.is_active,
							onCheckedChange: (v) => toggle(p.id, v)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "outline",
						onClick: () => declareWinner(p.id),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "mr-1 h-4 w-4" }), "Declare winner"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResetButton, { onConfirm: () => resetVotes(p.id) })
				]
			}, p.id))
		})]
	});
}
function ResetButton({ onConfirm }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		size: "sm",
		variant: "outline",
		onClick: () => setOpen(true),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "mr-1 h-4 w-4" }), " Reset votes"]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
		open,
		onOpenChange: setOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Reset all votes?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "This permanently deletes every vote for this period. Players can vote again." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancel" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
			onClick: onConfirm,
			children: "Reset"
		})] })] })
	})] });
}
function PlayersSection() {
	const qc = useQueryClient();
	const playersQ = useQuery({
		queryKey: ["admin-players"],
		queryFn: async () => {
			const [{ data: profiles }, { data: emails }] = await Promise.all([supabase.from("profiles").select("id, full_name, position, jersey_number, profile_image").order("full_name"), supabase.rpc("admin_list_player_emails")]);
			const emailMap = new Map((emails ?? []).map((e) => [e.id, e.email]));
			return (profiles ?? []).map((p) => ({
				...p,
				email: emailMap.get(p.id) ?? ""
			}));
		}
	});
	async function remove(id) {
		if (!confirm("Remove this player profile? (Their auth account stays but their data is removed.)")) return;
		const { error } = await supabase.from("profiles").delete().eq("id", id);
		if (error) toast.error(error.message);
		else {
			toast.success("Removed");
			qc.invalidateQueries({ queryKey: ["admin-players"] });
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "glass-strong rounded-2xl p-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
			className: "mb-4 font-display text-2xl",
			children: [
				"Players (",
				playersQ.data?.length ?? 0,
				")"
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "overflow-x-auto",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "text-left text-xs uppercase tracking-[0.15em] text-muted-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "Player"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "Email"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "Position"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: "px-3 py-2",
							children: "#"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "px-3 py-2" })
					] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: (playersQ.data ?? []).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t border-border/30",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
									path: p.profile_image,
									name: p.full_name,
									className: "h-8 w-8"
								}), p.full_name]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2 text-muted-foreground",
							children: p.email
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2",
							children: p.position
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2",
							children: p.jersey_number ?? "—"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-3 py-2 text-right",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "ghost",
								onClick: () => remove(p.id),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4 text-destructive" })
							})
						})
					]
				}, p.id)) })]
			})
		})]
	});
}
function HallOfFameSection() {
	const qc = useQueryClient();
	const [year, setYear] = (0, import_react.useState)((/* @__PURE__ */ new Date()).getFullYear() - 1);
	const [winner, setWinner] = (0, import_react.useState)("");
	const [points, setPoints] = (0, import_react.useState)("");
	const [notes, setNotes] = (0, import_react.useState)("");
	async function add() {
		if (!winner || !year) return toast.error("Year and winner required");
		const { error } = await supabase.from("hall_of_fame").upsert({
			year,
			winner_name: winner,
			total_points: points || null,
			notes: notes || null
		}, { onConflict: "year" });
		if (error) toast.error(error.message);
		else {
			toast.success("Added to Hall of Fame");
			setWinner("");
			setPoints("");
			setNotes("");
			qc.invalidateQueries({ queryKey: ["hof"] });
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "glass-strong rounded-2xl p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "mb-4 font-display text-2xl",
				children: "Hall of Fame"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-3 sm:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Year" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						value: year,
						onChange: (e) => setYear(Number(e.target.value))
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Winner name" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: winner,
							onChange: (e) => setWinner(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Points" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						value: points,
						onChange: (e) => setPoints(e.target.value ? Number(e.target.value) : "")
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sm:col-span-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Notes" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
							value: notes,
							onChange: (e) => setNotes(e.target.value),
							rows: 2
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				className: "mt-4 bg-gold-gradient text-background hover:opacity-90",
				onClick: add,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1 h-4 w-4" }), " Add entry"]
			})
		]
	});
}
//#endregion
export { AdminPage as component };
