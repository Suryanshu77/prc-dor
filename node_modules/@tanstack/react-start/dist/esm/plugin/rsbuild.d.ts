import { TanStackStartRsbuildInputConfig } from '@tanstack/start-plugin-core/rsbuild';
import { RsbuildPlugin } from '@rsbuild/core';
export declare function tanstackStart(options?: TanStackStartRsbuildInputConfig & {
    rsc?: {
        enabled?: boolean;
    };
}): RsbuildPlugin;
