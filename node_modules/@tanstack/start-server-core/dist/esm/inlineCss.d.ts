import { Awaitable } from '@tanstack/router-core';
export type HandlerInlineCssOption = boolean | ((ctx: {
    request: Request;
}) => Awaitable<boolean>);
export declare function getStaticHandlerInlineCssDefault(handlerInlineCss: HandlerInlineCssOption | undefined): boolean | undefined;
export declare function resolveInlineCssForRequest(opts: {
    request: Request;
    handlerInlineCss: HandlerInlineCssOption | undefined;
    requestInlineCss: boolean | undefined;
}): Promise<boolean>;
