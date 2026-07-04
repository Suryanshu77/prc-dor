import { TSS_SERVER_FUNCTION, ServerFnMeta } from '@tanstack/start-client-core';
export declare const createServerRpc: (serverFnMeta: ServerFnMeta, splitImportFn: (...args: any) => any) => ((...args: any) => any) & {
    url: string;
    serverFnMeta: ServerFnMeta;
    [TSS_SERVER_FUNCTION]: boolean;
};
