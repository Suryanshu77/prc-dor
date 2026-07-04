import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { n as useAuth } from "./auth-C9iSOyPB.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { F as useNavigate, P as Navigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as Trophy } from "../_libs/lucide-react.mjs";
import { a as stringType, i as objectType, n as enumType, r as literalType, t as coerce } from "../_libs/zod.mjs";
import { t as Route } from "./auth-CdHmD7X-.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { i as Trigger, n as List, r as Root2, t as Content } from "../_libs/radix-ui__react-tabs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-DBdsmCrb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Tabs = Root2;
var TabsList = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(List, {
	ref,
	className: cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className),
	...props
}));
TabsList.displayName = List.displayName;
var TabsTrigger = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trigger, {
	ref,
	className: cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow", className),
	...props
}));
TabsTrigger.displayName = Trigger.displayName;
var TabsContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content, {
	ref,
	className: cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className),
	...props
}));
TabsContent.displayName = Content.displayName;
var POSITIONS = [
	"Goalkeeper",
	"Defender",
	"Midfielder",
	"Winger",
	"Striker"
];
function AuthPage() {
	const { user, loading } = useAuth();
	const { mode } = Route.useSearch();
	const navigate = useNavigate();
	if (!loading && user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Navigate, { to: "/dashboard" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex min-h-screen items-center justify-center px-4 py-12",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-none absolute inset-0 -z-10",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[var(--gold)] opacity-10 blur-3xl" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-6 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold-gradient text-background shadow-gold",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "h-7 w-7" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-3xl text-gold-gradient",
						children: "PRC D'or"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: "Football community awards"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "glass-strong rounded-2xl p-6 shadow-glow",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
					defaultValue: mode ?? "login",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
							className: "grid w-full grid-cols-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "login",
								children: "Sign in"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "signup",
								children: "Create account"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "login",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoginForm, { onSuccess: () => navigate({ to: "/dashboard" }) })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "signup",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignupForm, { onSuccess: () => navigate({ to: "/dashboard" }) })
						})
					]
				})
			})]
		})]
	});
}
function LoginForm({ onSuccess }) {
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password
		});
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		onSuccess();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "mt-6 space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "email",
					required: true,
					value: email,
					onChange: (e) => setEmail(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Password" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "password",
					required: true,
					value: password,
					onChange: (e) => setPassword(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				className: "w-full bg-gold-gradient text-background hover:opacity-90",
				children: busy ? "Signing in…" : "Sign in"
			})
		]
	});
}
var signupSchema = objectType({
	full_name: stringType().trim().min(2).max(80),
	nickname: stringType().trim().max(40).optional().or(literalType("")),
	age: coerce.number().int().min(8).max(80),
	position: enumType(POSITIONS),
	jersey_number: coerce.number().int().min(1).max(99).optional().or(literalType("")),
	email: stringType().email().max(255),
	password: stringType().min(6).max(72),
	confirm: stringType()
});
function SignupForm({ onSuccess }) {
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [photo, setPhoto] = (0, import_react.useState)(null);
	async function submit(e) {
		e.preventDefault();
		const form = new FormData(e.currentTarget);
		const parsed = signupSchema.safeParse(Object.fromEntries(form));
		if (!parsed.success) {
			toast.error(parsed.error.issues[0].message);
			return;
		}
		const data = parsed.data;
		if (data.password !== data.confirm) {
			toast.error("Passwords don't match");
			return;
		}
		setBusy(true);
		const { data: signed, error } = await supabase.auth.signUp({
			email: data.email,
			password: data.password,
			options: {
				emailRedirectTo: `${window.location.origin}/dashboard`,
				data: {
					full_name: data.full_name,
					nickname: data.nickname || null,
					age: String(data.age),
					position: data.position,
					jersey_number: data.jersey_number ? String(data.jersey_number) : ""
				}
			}
		});
		if (error || !signed.user) {
			setBusy(false);
			toast.error(error?.message ?? "Sign up failed");
			return;
		}
		if (photo) {
			const ext = photo.name.split(".").pop() ?? "jpg";
			const path = `${signed.user.id}/avatar.${ext}`;
			const { error: upErr } = await supabase.storage.from("avatars").upload(path, photo, {
				upsert: true,
				contentType: photo.type
			});
			if (!upErr) await supabase.from("profiles").update({ profile_image: path }).eq("id", signed.user.id);
		}
		setBusy(false);
		toast.success("Welcome to PRC D'or!");
		onSuccess();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		onSubmit: submit,
		className: "mt-6 grid gap-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Full name",
					name: "full_name",
					required: true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Nickname",
					name: "nickname",
					placeholder: "optional"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Age",
					name: "age",
					type: "number",
					min: 8,
					max: 80,
					required: true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Jersey #",
					name: "jersey_number",
					type: "number",
					min: 1,
					max: 99,
					placeholder: "optional"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Position" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					name: "position",
					required: true,
					defaultValue: "Midfielder",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: POSITIONS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: p,
						children: p
					}, p)) })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Profile photo" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "file",
					accept: "image/*",
					onChange: (e) => setPhoto(e.target.files?.[0] ?? null)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
				label: "Email",
				name: "email",
				type: "email",
				required: true
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Password",
					name: "password",
					type: "password",
					required: true
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Confirm",
					name: "confirm",
					type: "password",
					required: true
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				type: "submit",
				disabled: busy,
				className: "mt-2 w-full bg-gold-gradient text-background hover:opacity-90",
				children: busy ? "Creating account…" : "Join PRC D'or"
			})
		]
	});
}
function Field({ label, ...rest }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, { ...rest })]
	});
}
//#endregion
export { AuthPage as component };
