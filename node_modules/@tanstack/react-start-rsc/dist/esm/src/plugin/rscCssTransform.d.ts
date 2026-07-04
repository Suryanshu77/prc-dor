import { StartCompilerImportTransform } from '@tanstack/start-plugin-core';
export declare function createRscCssCompilerTransforms(opts: {
    loadCssExpression: string;
    serverFnProviderOnly?: boolean | undefined;
}): Array<StartCompilerImportTransform>;
