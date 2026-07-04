//#region src/import-protection/defaults.ts
var frameworks = [
	"react",
	"solid",
	"vue"
];
/**
* Returns the default import protection rules.
*
* All three framework variants are always included so that, e.g., a React
* project also denies `@tanstack/solid-start/server` imports.
*/
function getDefaultImportProtectionRules() {
	return {
		client: {
			specifiers: frameworks.map((fw) => `@tanstack/${fw}-start/server`),
			files: ["**/*.server.*"],
			excludeFiles: ["**/node_modules/**"]
		},
		server: {
			specifiers: [],
			files: ["**/*.client.*"],
			excludeFiles: ["**/node_modules/**"]
		}
	};
}
/**
* Marker module specifiers that restrict a file to a specific environment.
*/
function getMarkerSpecifiers() {
	return {
		serverOnly: frameworks.map((fw) => `@tanstack/${fw}-start/server-only`),
		clientOnly: frameworks.map((fw) => `@tanstack/${fw}-start/client-only`)
	};
}
//#endregion
export { getDefaultImportProtectionRules, getMarkerSpecifiers };

//# sourceMappingURL=defaults.js.map