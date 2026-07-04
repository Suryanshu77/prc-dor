import { i as __toESM } from "../_runtime.mjs";
import { M as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-DmOQ0hkH.mjs";
import { i as require_react } from "../_libs/dnd-kit__accessibility+react.mjs";
import { n as useAuth } from "./auth-C9iSOyPB.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as PlayerAvatar } from "./PlayerAvatar-DWQl0Nc4.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-CiWBxva_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var POSITIONS = [
	"Goalkeeper",
	"Defender",
	"Midfielder",
	"Winger",
	"Striker"
];
function ProfilePage() {
	const { user } = useAuth();
	const qc = useQueryClient();
	const profileQ = useQuery({
		queryKey: ["profile", user?.id],
		enabled: !!user,
		queryFn: async () => {
			const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
			return data;
		}
	});
	const [form, setForm] = (0, import_react.useState)(null);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [photo, setPhoto] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (profileQ.data) setForm(profileQ.data);
	}, [profileQ.data]);
	if (!form) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "py-20 text-center text-muted-foreground",
		children: "Loading…"
	});
	async function save() {
		setBusy(true);
		let imagePath = form.profile_image;
		if (photo) {
			const ext = photo.name.split(".").pop() ?? "jpg";
			const path = `${user.id}/avatar.${ext}`;
			const { error } = await supabase.storage.from("avatars").upload(path, photo, {
				upsert: true,
				contentType: photo.type
			});
			if (error) {
				toast.error(error.message);
				setBusy(false);
				return;
			}
			imagePath = path;
		}
		const { error } = await supabase.from("profiles").update({
			full_name: form.full_name,
			nickname: form.nickname,
			age: form.age,
			position: form.position,
			jersey_number: form.jersey_number,
			profile_image: imagePath
		}).eq("id", user.id);
		setBusy(false);
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Profile updated");
		qc.invalidateQueries({ queryKey: ["profile"] });
		qc.invalidateQueries({ queryKey: ["players"] });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-xl space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl",
			children: "Your profile"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-muted-foreground",
			children: "Update how you appear in the PRC D'or directory."
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "glass-strong rounded-2xl p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-6 flex items-center gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlayerAvatar, {
						path: form.profile_image,
						name: form.full_name,
						className: "h-20 w-20",
						ring: true
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						className: "text-xs",
						children: "Replace photo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "file",
						accept: "image/*",
						onChange: (e) => setPhoto(e.target.files?.[0] ?? null)
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Full name",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.full_name ?? "",
								onChange: (e) => setForm({
									...form,
									full_name: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Nickname",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.nickname ?? "",
								onChange: (e) => setForm({
									...form,
									nickname: e.target.value
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Age",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									value: form.age ?? "",
									onChange: (e) => setForm({
										...form,
										age: e.target.value ? Number(e.target.value) : null
									})
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
								label: "Jersey #",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "number",
									value: form.jersey_number ?? "",
									onChange: (e) => setForm({
										...form,
										jersey_number: e.target.value ? Number(e.target.value) : null
									})
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, {
							label: "Position",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.position ?? "",
								onValueChange: (v) => setForm({
									...form,
									position: v
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: POSITIONS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: p,
									children: p
								}, p)) })]
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: save,
					disabled: busy,
					className: "mt-6 w-full bg-gold-gradient text-background hover:opacity-90",
					children: busy ? "Saving…" : "Save changes"
				})
			]
		})]
	});
}
function Row({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: label }), children]
	});
}
//#endregion
export { ProfilePage as component };
