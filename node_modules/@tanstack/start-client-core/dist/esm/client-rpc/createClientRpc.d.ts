import { TSS_SERVER_FUNCTION, ClientFnMeta } from '../constants.js';
export declare function createClientRpc(functionId: string): ((...args: Array<any>) => Promise<any>) & {
    url: string;
    serverFnMeta: ClientFnMeta;
    [TSS_SERVER_FUNCTION]: boolean;
};
