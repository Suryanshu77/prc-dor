import { fileURLToPath } from "node:url";
import path from "pathe";
//#region src/plugin/shared.ts
var currentDir = path.dirname(fileURLToPath(import.meta.url));
var reactStartPluginDir = currentDir;
var defaultEntryDir = path.resolve(currentDir, "..", "..", "plugin", "default-entry");
var reactStartDefaultEntryPaths = {
	client: path.resolve(defaultEntryDir, "client.tsx"),
	server: path.resolve(defaultEntryDir, "server.ts"),
	start: path.resolve(defaultEntryDir, "start.ts")
};
//#endregion
export { reactStartDefaultEntryPaths, reactStartPluginDir };

//# sourceMappingURL=shared.js.map