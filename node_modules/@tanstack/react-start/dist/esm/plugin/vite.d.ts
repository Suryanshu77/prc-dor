import { TanStackStartViteInputConfig } from '@tanstack/start-plugin-core/vite';
import { PluginOption } from 'vite';
export declare function tanstackStart(options?: TanStackStartViteInputConfig & {
    rsc?: {
        enabled?: boolean;
    };
}): Array<PluginOption>;
