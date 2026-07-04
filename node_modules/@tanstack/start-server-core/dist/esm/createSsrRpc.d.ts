import { TSS_SERVER_FUNCTION, ClientFnMeta } from '@tanstack/start-client-core';
export declare const createSsrRpc: (functionId: string) => ((...args: Array<any>) => Promise<any>) & {
    url: string;
    serverFnMeta: ClientFnMeta;
    [TSS_SERVER_FUNCTION]: boolean;
};
