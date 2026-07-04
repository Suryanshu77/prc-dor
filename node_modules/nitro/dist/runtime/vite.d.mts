type FetchableEnv = {
	fetch: (request: Request) => Response | Promise<Response>;
};
declare global {
	var __nitro_vite_envs__: Record<string, FetchableEnv>;
}
export declare function fetchViteEnv(viteEnvName: string, input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
export {};
