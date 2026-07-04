import { TanStackStartVitePluginCoreOptions } from '@tanstack/start-plugin-core/vite';
import { PluginOption } from 'vite';
export declare function configureRsc(): {
    envName: string;
    providerEnvironmentName: TanStackStartVitePluginCoreOptions['providerEnvironmentName'];
    ssrResolverStrategy: TanStackStartVitePluginCoreOptions['ssrResolverStrategy'];
    serializationAdapters: TanStackStartVitePluginCoreOptions['serializationAdapters'];
    compilerTransforms: TanStackStartVitePluginCoreOptions['compilerTransforms'];
};
export declare function reactStartRscVitePlugin(): PluginOption;
