import "#nitro/virtual/polyfills";
import { toNodeHandler } from "srvx/node";
import { useNitroApp, getRouteRules } from "nitro/app";
import { isrRouteRewrite } from "./isr.mjs";
const nitroApp = useNitroApp();
const handler = toNodeHandler(nitroApp.fetch);
export default function nodeHandler(req, res) {
	
	
	let ip;
	Object.defineProperty(req.socket, "remoteAddress", { get() {
		const h = req.headers["x-forwarded-for"];
		return ip ??= h?.split?.(",").shift()?.trim();
	} });
	
	const isrURL = isrRouteRewrite(req.url, req.headers["x-now-route-matches"]);
	if (isrURL) {
		const { routeRules } = getRouteRules("", isrURL[0]);
		if (routeRules?.isr) {
			req.url = isrURL[0] + (isrURL[1] ? `?${isrURL[1]}` : "");
		}
	}
	return handler(req, res);
}
