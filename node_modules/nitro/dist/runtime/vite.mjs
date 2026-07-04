import { HTTPError, toRequest } from "h3";
export function fetchViteEnv(viteEnvName, input, init) {
	const envs = globalThis.__nitro_vite_envs__ || {};
	const viteEnv = envs[viteEnvName];
	if (!viteEnv) {
		throw HTTPError.status(404);
	}
	return Promise.resolve(viteEnv.fetch(toRequest(input, init)));
}
