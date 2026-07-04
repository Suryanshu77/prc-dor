import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime, d as DialogContent$1, f as DialogDescription$1, h as DialogTitle$1, l as Dialog$1, m as DialogPortal$1, p as DialogOverlay$1, u as DialogClose } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { n as useAuth } from "./auth-C9iSOyPB.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { a as closestCenter, d as useSensors, f as CSS, i as TouchSensor, r as PointerSensor, t as DndContext, u as useSensor } from "../_libs/@dnd-kit/core+[...].mjs";
import { t as PlayerAvatar } from "./PlayerAvatar-DWQl0Nc4.mjs";
import { F as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { T as TriangleAlert, _ as GripVertical, d as Plus, t as X, x as Check } from "../_libs/lucide-react.mjs";
import { i as verticalListSortingStrategy, n as arrayMove, r as useSortable, t as SortableContext } from "../_libs/dnd-kit__sortable.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/vote-BQZTGoS3.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var POINTS_BY_RANK = {
	1: 15,
	2: 12,
	3: 10,
	4: 8,
	5: 7,
	6: 6,
	7: 5,
	8: 4,
	9: 3,
	10: 2
};
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
});
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
DialogFooter.displayName = "DialogFooter";
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogDescription$1.displayName;
function VotePage() {
	const { user } = useAuth();
	const qc = useQueryClient();
	const navigate = useNavigate();
	const periodQ = useQuery({
		queryKey: ["active-period"],
		queryFn: async () => {
			const { data } = await supabase.from("voting_periods").select("*").eq("is_active", true).order("year", { ascending: false }).limit(1).maybeSingle();
			return data;
		}
	});
	const playersQ = useQuery({
		queryKey: ["players-vote"],
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("id, full_name, nickname, position, jersey_number, profile_image").order("full_name");
			return data ?? [];
		}
	});
	const myVoteQ = useQuery({
		queryKey: [
			"my-vote",
			user?.id,
			periodQ.data?.id
		],
		enabled: !!user && !!periodQ.data,
		queryFn: async () => {
			const { data } = await supabase.from("votes").select("*").eq("voter_id", user.id).eq("voting_period_id", periodQ.data.id);
			return data ?? [];
		}
	});
	const [ranking, setRanking] = (0, import_react.useState)([]);
	const [confirmOpen, setConfirmOpen] = (0, import_react.useState)(false);
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	const eligible = (0, import_react.useMemo)(() => (playersQ.data ?? []).filter((p) => p.id !== user?.id), [playersQ.data, user]);
	const available = (0, import_react.useMemo)(() => eligible.filter((p) => !ranking.find((r) => r.id === p.id)), [eligible, ranking]);
	const sensors = useSensors(useSensor(PointerSensor), useSensor(TouchSensor));
	const alreadyVoted = (myVoteQ.data ?? []).length > 0;
	if (periodQ.isLoading || playersQ.isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-20 text-center text-muted-foreground",
		children: "Loading the voting booth…"
	});
	if (!periodQ.data?.is_active) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
		title: "Voting is closed",
		desc: "The voting period isn't active right now. Check back soon!"
	});
	if (alreadyVoted) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, {
		title: "Your vote is locked in",
		desc: "You've already cast your PRC D'or vote. Head over to results to see how it's shaping up.",
		cta: {
			label: "View results",
			onClick: () => navigate({ to: "/results" })
		}
	});
	function add(p) {
		if (ranking.length >= 10) {
			toast.error("You can only rank 10 players");
			return;
		}
		setRanking([...ranking, p]);
	}
	function remove(id) {
		setRanking(ranking.filter((p) => p.id !== id));
	}
	function onDragEnd(e) {
		const { active, over } = e;
		if (!over || active.id === over.id) return;
		setRanking(arrayMove(ranking, ranking.findIndex((p) => p.id === active.id), ranking.findIndex((p) => p.id === over.id)));
	}
	async function submit() {
		if (ranking.length !== 10) {
			toast.error("Rank exactly 10 players");
			return;
		}
		setSubmitting(true);
		const rows = ranking.map((p, i) => ({
			voter_id: user.id,
			ranked_player_id: p.id,
			rank_position: i + 1,
			points: POINTS_BY_RANK[i + 1],
			voting_period_id: periodQ.data.id
		}));
		const { error } = await supabase.from("votes").insert(rows);
		setSubmitting(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Vote submitted — thank you!");
		qc.invalidateQueries({ queryKey: ["my-vote"] });
		qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
		navigate({ to: "/results" });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs uppercase tracking-[0.2em] text-gold",
					children: "Cast your vote"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-4xl",
					children: "Rank your Top 10"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-muted-foreground",
					children: "Drag to reorder. 1st = 15 pts · 2nd = 12 · 3rd = 10 · 4th = 8 · 5th = 7 · 6th = 6 · 7th = 5 · 8th = 4 · 9th = 3 · 10th = 2. You can't vote for yourself."
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-6 lg:grid-cols-[1fr_1fr]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass-strong rounded-2xl p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-4 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
								className: "font-display text-lg",
								children: [
									"Your ranking (",
									ranking.length,
									"/10)"
								]
							}), ranking.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								className: "text-xs text-muted-foreground hover:text-destructive",
								onClick: () => setRanking([]),
								children: "Clear"
							})]
						}),
						ranking.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground",
							children: "Add players from the right to start your top 10."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DndContext, {
							sensors,
							collisionDetection: closestCenter,
							onDragEnd,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortableContext, {
								items: ranking.map((r) => r.id),
								strategy: verticalListSortingStrategy,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
									className: "space-y-2",
									children: ranking.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SortableRow, {
										player: p,
										index: i,
										onRemove: () => remove(p.id)
									}, p.id))
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => setConfirmOpen(true),
							disabled: ranking.length !== 10,
							className: "mt-5 w-full bg-gold-gradient text-background hover:opacity-90",
							children: "Submit final ranking"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "glass rounded-2xl p-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mb-4 font-display text-lg",
						children: "Available players"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid max-h-[600px] gap-2 overflow-y-auto pr-2",
						children: [available.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => add(p),
							disabled: ranking.length >= 10,
							className: "group flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-left transition hover:border-[var(--gold)] disabled:opacity-40",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
									path: p.profile_image,
									name: p.full_name,
									className: "h-10 w-10"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "truncate text-sm font-medium",
										children: p.full_name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-muted-foreground",
										children: [
											p.position,
											" ",
											p.jersey_number ? `· #${p.jersey_number}` : ""
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 text-gold opacity-0 transition group-hover:opacity-100" })
							]
						}, p.id)), available.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-center text-sm text-muted-foreground",
							children: "Everyone's been ranked."
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: confirmOpen,
				onOpenChange: setConfirmOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
					className: "glass-strong",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
							className: "flex items-center gap-2 font-display",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-5 w-5 text-gold" }), " Confirm your vote"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Are you sure? Votes cannot be changed after submission." })] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ol", {
							className: "max-h-72 space-y-1 overflow-y-auto text-sm",
							children: ranking.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-center justify-between rounded-md bg-secondary/40 px-3 py-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-gold",
										children: ["#", i + 1]
									}),
									" ",
									p.full_name
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs text-muted-foreground",
									children: [POINTS_BY_RANK[i + 1], " pts"]
								})]
							}, p.id))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setConfirmOpen(false),
							children: "Go back"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: submit,
							disabled: submitting,
							className: "bg-gold-gradient text-background hover:opacity-90",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "mr-1 h-4 w-4" }),
								" ",
								submitting ? "Submitting…" : "Confirm vote"
							]
						})] })
					]
				})
			})
		]
	});
}
function SortableRow({ player, index, onRemove }) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		ref: setNodeRef,
		style: {
			transform: CSS.Transform.toString(transform),
			transition,
			opacity: isDragging ? .6 : 1
		},
		className: "flex items-center gap-3 rounded-xl border border-[var(--gold)]/30 bg-secondary/30 p-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				...attributes,
				...listeners,
				className: "cursor-grab touch-none text-muted-foreground",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GripVertical, { className: "h-5 w-5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient font-display text-sm text-background",
				children: index + 1
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
				path: player.profile_image,
				name: player.full_name,
				className: "h-10 w-10"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "truncate text-sm font-medium",
					children: player.full_name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted-foreground",
					children: player.position
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-sm font-medium text-gold",
				children: [POINTS_BY_RANK[index + 1], " pts"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: onRemove,
				className: "rounded-md p-1 text-muted-foreground hover:text-destructive",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
			})
		]
	});
}
function EmptyState({ title, desc, cta }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto mt-12 max-w-md rounded-2xl glass-strong p-8 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-2xl text-gold-gradient",
				children: title
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted-foreground",
				children: desc
			}),
			cta && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				className: "mt-5 bg-gold-gradient text-background hover:opacity-90",
				onClick: cta.onClick,
				children: cta.label
			})
		]
	});
}
//#endregion
export { VotePage as component };
