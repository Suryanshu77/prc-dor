globalThis.__nitro_main__ = import.meta.url;
import { a as FastResponse, n as HTTPError, r as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/assets/admin-Cn-VWbo-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4418-jCoKvwDqapPSgjdwmYyrnVaftCE\"",
		"mtime": "2026-07-04T11:06:23.143Z",
		"size": 17432,
		"path": "../public/assets/admin-Cn-VWbo-.js"
	},
	"/assets/auth-DEIM1MVb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2f7e-2IPjZ8G8RispkuUtKw5Sory4AOk\"",
		"mtime": "2026-07-04T11:06:23.149Z",
		"size": 12158,
		"path": "../public/assets/auth-DEIM1MVb.js"
	},
	"/assets/analytics-D3tNvg4Y.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61812-hiYFJWeXr80IGAtc9BidmVpC7uM\"",
		"mtime": "2026-07-04T11:06:23.145Z",
		"size": 399378,
		"path": "../public/assets/analytics-D3tNvg4Y.js"
	},
	"/assets/button-DozzfkjE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7a6-Kllax2fyTcE/RxLbxnHKhF7krs0\"",
		"mtime": "2026-07-04T11:06:23.151Z",
		"size": 1958,
		"path": "../public/assets/button-DozzfkjE.js"
	},
	"/assets/check-CPu_bhpr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7c-bqsRmKQdk5yrXUifr+M0AVvTbTI\"",
		"mtime": "2026-07-04T11:06:23.152Z",
		"size": 124,
		"path": "../public/assets/check-CPu_bhpr.js"
	},
	"/assets/clsx-CjueKrWZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"170-hIN6XMVOMUzluNGmYPaM/SbauwQ\"",
		"mtime": "2026-07-04T11:06:23.153Z",
		"size": 368,
		"path": "../public/assets/clsx-CjueKrWZ.js"
	},
	"/assets/createLucideIcon-CmnI5xTX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ab-A0b2hKYc+2f0SUVWmJChTjDFJ5s\"",
		"mtime": "2026-07-04T11:06:23.154Z",
		"size": 1195,
		"path": "../public/assets/createLucideIcon-CmnI5xTX.js"
	},
	"/assets/crown-CvOjaFpf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"16a-ERAdTKNmdb1ghpy+V8ZzLmPgzOM\"",
		"mtime": "2026-07-04T11:06:23.156Z",
		"size": 362,
		"path": "../public/assets/crown-CvOjaFpf.js"
	},
	"/assets/dashboard-DD_R70bD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1a2a-SBx1uVA9A9HlS3x7Aa8+gillkSE\"",
		"mtime": "2026-07-04T11:06:23.158Z",
		"size": 6698,
		"path": "../public/assets/dashboard-DD_R70bD.js"
	},
	"/assets/dist-BzwDokNw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"501-yALe0iNpZuP/vkD8dq5Wa5BcM2Q\"",
		"mtime": "2026-07-04T11:06:23.159Z",
		"size": 1281,
		"path": "../public/assets/dist-BzwDokNw.js"
	},
	"/assets/dist-CF2Klzrn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"111f-sJ2SXW0vJlombcVTcehFCrky+qA\"",
		"mtime": "2026-07-04T11:06:23.160Z",
		"size": 4383,
		"path": "../public/assets/dist-CF2Klzrn.js"
	},
	"/assets/dist-CVSpLy2x.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"903-/0MGUrxqSBHncqg+vgh55QVorxo\"",
		"mtime": "2026-07-04T11:06:23.161Z",
		"size": 2307,
		"path": "../public/assets/dist-CVSpLy2x.js"
	},
	"/assets/es2015-C0_LrIK6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6547-NupM7tsb6H21ezzQ6hEfchXDJgY\"",
		"mtime": "2026-07-04T11:06:23.162Z",
		"size": 25927,
		"path": "../public/assets/es2015-C0_LrIK6.js"
	},
	"/assets/hall-of-fame-H-DIgEMf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"87a-FNxrBrqySZuOwfXlb9kNiirs1x4\"",
		"mtime": "2026-07-04T11:06:23.164Z",
		"size": 2170,
		"path": "../public/assets/hall-of-fame-H-DIgEMf.js"
	},
	"/assets/label--dnPILyz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"28b-acJZ2XD4vEo1aZ8j6zet9fpMq74\"",
		"mtime": "2026-07-04T11:06:23.166Z",
		"size": 651,
		"path": "../public/assets/label--dnPILyz.js"
	},
	"/assets/jsx-runtime-DCRiAnuU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"34190-CiXT4NJHx5UwyfcKdBY6S7/Y+C0\"",
		"mtime": "2026-07-04T11:06:23.166Z",
		"size": 213392,
		"path": "../public/assets/jsx-runtime-DCRiAnuU.js"
	},
	"/assets/index-DCDQsNvC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"62a78-ULkSmJG/j5sawnS43BPW1ao33+E\"",
		"mtime": "2026-07-04T11:06:23.141Z",
		"size": 404088,
		"path": "../public/assets/index-DCDQsNvC.js"
	},
	"/assets/link-80bIZEIA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"58d5-3DKl5E3XAvJwA90MTF8AMD8DO0w\"",
		"mtime": "2026-07-04T11:06:23.168Z",
		"size": 22741,
		"path": "../public/assets/link-80bIZEIA.js"
	},
	"/assets/matchContext-3BgVwkkF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8e-BM93DOd/cySPbeBeL0FiVrAllME\"",
		"mtime": "2026-07-04T11:06:23.168Z",
		"size": 142,
		"path": "../public/assets/matchContext-3BgVwkkF.js"
	},
	"/assets/PlayerAvatar-eRLmvt-n.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"436-nU125a6yPCZsa2JsphKJqC0BZsE\"",
		"mtime": "2026-07-04T11:06:23.142Z",
		"size": 1078,
		"path": "../public/assets/PlayerAvatar-eRLmvt-n.js"
	},
	"/assets/players-B2BObISd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"b7d-ZjLPyyAIh4iLT8Da9nuC9Fppjos\"",
		"mtime": "2026-07-04T11:06:23.170Z",
		"size": 2941,
		"path": "../public/assets/players-B2BObISd.js"
	},
	"/assets/players._id-fP7bPQvy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ee9-a6yi6vC1EM02zGcAtsvNpHfBf8M\"",
		"mtime": "2026-07-04T11:06:23.170Z",
		"size": 3817,
		"path": "../public/assets/players._id-fP7bPQvy.js"
	},
	"/assets/profile-DhW9RDFX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d47-SfP3Sd0VcMXXpdiCRyVF1stg/c4\"",
		"mtime": "2026-07-04T11:06:23.172Z",
		"size": 3399,
		"path": "../public/assets/profile-DhW9RDFX.js"
	},
	"/assets/react-dom-CirtODEy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"dda-s0RjOL/vsQgf4Sk1e4wi8yyNZi4\"",
		"mtime": "2026-07-04T11:06:23.172Z",
		"size": 3546,
		"path": "../public/assets/react-dom-CirtODEy.js"
	},
	"/assets/redirect-BB44wZa9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"245-K3qCyv600LQ802/aV+Gg83W7kdk\"",
		"mtime": "2026-07-04T11:06:23.174Z",
		"size": 581,
		"path": "../public/assets/redirect-BB44wZa9.js"
	},
	"/assets/results-NzcawOX1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3eab-UGCgr8CXncNLBoOy/IDvzeew6nI\"",
		"mtime": "2026-07-04T11:06:23.175Z",
		"size": 16043,
		"path": "../public/assets/results-NzcawOX1.js"
	},
	"/assets/route-CgvwR_k-.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1219-uKSgrG7LZPR/guWY0RYyw8RUO/M\"",
		"mtime": "2026-07-04T11:06:23.177Z",
		"size": 4633,
		"path": "../public/assets/route-CgvwR_k-.js"
	},
	"/assets/routes-YPxUcmGJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1046-NjYh+olW+S+Vkl2OqFvAiJgcqZU\"",
		"mtime": "2026-07-04T11:06:23.177Z",
		"size": 4166,
		"path": "../public/assets/routes-YPxUcmGJ.js"
	},
	"/assets/shield-KrpROjmC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"110-J56x6wQ5GefHXb5tbZYy0+gySTI\"",
		"mtime": "2026-07-04T11:06:23.181Z",
		"size": 272,
		"path": "../public/assets/shield-KrpROjmC.js"
	},
	"/assets/trophy-BbKNnyT0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1dc-1ZmSshtpLSzZ/1YSOJ0dQH5N6uM\"",
		"mtime": "2026-07-04T11:06:23.181Z",
		"size": 476,
		"path": "../public/assets/trophy-BbKNnyT0.js"
	},
	"/assets/styles-Cnu_f-qc.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"14ac5-Ni+P2uyy8VcJEIt1GG+CHh4xaTI\"",
		"mtime": "2026-07-04T11:06:23.197Z",
		"size": 84677,
		"path": "../public/assets/styles-Cnu_f-qc.css"
	},
	"/assets/trophy-hero-DeHKduvF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"38-2KKwk2B/o0N1mH4u2/YXYBlLplc\"",
		"mtime": "2026-07-04T11:06:23.189Z",
		"size": 56,
		"path": "../public/assets/trophy-hero-DeHKduvF.js"
	},
	"/assets/useQuery-CUTtmvQq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"224d-OhD/5GKybzkgXPG5KdLfzVgY3v4\"",
		"mtime": "2026-07-04T11:06:23.191Z",
		"size": 8781,
		"path": "../public/assets/useQuery-CUTtmvQq.js"
	},
	"/assets/select-D5KDXSfK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"c1b3-Ggqmn48qn4PTFDdKU+FRBh9HSoQ\"",
		"mtime": "2026-07-04T11:06:23.181Z",
		"size": 49587,
		"path": "../public/assets/select-D5KDXSfK.js"
	},
	"/assets/useRouter-D8-B48FQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b2-1cm1GaCWrrXC8/Qh0r0XGFYq8Ao\"",
		"mtime": "2026-07-04T11:06:23.191Z",
		"size": 690,
		"path": "../public/assets/useRouter-D8-B48FQ.js"
	},
	"/assets/trophy-hero-DzY0-szQ.jpg": {
		"type": "image/jpeg",
		"etag": "\"23a49-E75vUChODQW7m8jpWeMzH7+EUDk\"",
		"mtime": "2026-07-04T11:06:23.198Z",
		"size": 145993,
		"path": "../public/assets/trophy-hero-DzY0-szQ.jpg"
	},
	"/assets/vote-CyVwgGSd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e3-OzCGypEMN2Xowpi8ahCt6Fu9XmM\"",
		"mtime": "2026-07-04T11:06:23.195Z",
		"size": 483,
		"path": "../public/assets/vote-CyVwgGSd.js"
	},
	"/assets/utils-B9URw_CD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6936-IDn15ekKTsa+z3GJnrtfek/Td4M\"",
		"mtime": "2026-07-04T11:06:23.193Z",
		"size": 26934,
		"path": "../public/assets/utils-B9URw_CD.js"
	},
	"/assets/vote-CpTQth8l.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ce85-KBKRpjhHfjp/PXYkvSXpm8S0uvg\"",
		"mtime": "2026-07-04T11:06:23.193Z",
		"size": 52869,
		"path": "../public/assets/vote-CpTQth8l.js"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_sxt7gu = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_sxt7gu
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };
