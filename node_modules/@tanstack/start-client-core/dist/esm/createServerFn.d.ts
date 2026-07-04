import { TSS_SERVER_FUNCTION_FACTORY, ClientFnMeta, ServerFnMeta, TSS_SERVER_FUNCTION } from './constants.js';
import { AnyValidator, Constrain, Expand, Register, RegisteredSerializableInput, ResolveValidatorInput, ValidateSerializable, ValidateSerializableInput, Validator } from '@tanstack/router-core';
import { AnyFunctionMiddleware, AnyRequestMiddleware, AssignAllServerFnContext, IntersectAllValidatorInputs, IntersectAllValidatorOutputs } from './createMiddleware.js';
export type ServerFnStrict = boolean | {
    input?: boolean;
    output?: boolean;
};
export interface ServerFnOptions<TMethod extends Method = Method, TStrict extends ServerFnStrict = true> {
    method?: TMethod;
    strict?: TStrict;
}
export type ServerFnStrictInput<TStrict extends ServerFnStrict> = TStrict extends false ? false : TStrict extends {
    input: infer TInput extends boolean;
} ? TInput : true;
export type ServerFnStrictOutput<TStrict extends ServerFnStrict> = TStrict extends false ? false : TStrict extends {
    output: infer TOutput extends boolean;
} ? TOutput : true;
export type CreateServerFn<TRegister> = <TMethod extends Method, TStrict extends ServerFnStrict = true, TResponse = unknown, TMiddlewares = undefined, TInputValidator = undefined>(options?: ServerFnOptions<TMethod, TStrict>, __opts?: ServerFnBaseOptions<TRegister, TMethod, TResponse, TMiddlewares, TInputValidator, TStrict>) => ServerFnBuilder<TRegister, TMethod, TStrict>;
export declare const createServerFn: CreateServerFn<Register>;
export declare function executeMiddleware(middlewares: Array<AnyFunctionMiddleware | AnyRequestMiddleware>, env: 'client' | 'server', opts: ServerFnMiddlewareOptions): Promise<ServerFnMiddlewareResult>;
export type CompiledFetcherFnOptions = {
    method: Method;
    data: unknown;
    headers?: HeadersInit;
    signal?: AbortSignal;
    fetch?: CustomFetch;
    context?: any;
};
export type Fetcher<TMiddlewares, TInputValidator, TResponse> = undefined extends IntersectAllValidatorInputs<TMiddlewares, TInputValidator> ? OptionalFetcher<TMiddlewares, TInputValidator, TResponse> : RequiredFetcher<TMiddlewares, TInputValidator, TResponse>;
export interface FetcherBase {
    [TSS_SERVER_FUNCTION]: true;
    url: string;
    method: Method;
    __executeServer: (opts: {
        method: Method;
        data: unknown;
        headers?: HeadersInit;
        context?: any;
    }) => Promise<unknown>;
}
export interface OptionalFetcher<TMiddlewares, TInputValidator, TResponse> extends FetcherBase {
    (options?: OptionalFetcherDataOptions<TMiddlewares, TInputValidator>): Promise<Awaited<TResponse>>;
}
export interface RequiredFetcher<TMiddlewares, TInputValidator, TResponse> extends FetcherBase {
    (opts: RequiredFetcherDataOptions<TMiddlewares, TInputValidator>): Promise<Awaited<TResponse>>;
}
export type CustomFetch = typeof fetch extends (...args: infer A) => infer R ? (...args: A) => R : never;
export type FetcherBaseOptions = {
    headers?: HeadersInit;
    signal?: AbortSignal;
    fetch?: CustomFetch;
};
export interface OptionalFetcherDataOptions<TMiddlewares, TInputValidator> extends FetcherBaseOptions {
    data?: Expand<IntersectAllValidatorInputs<TMiddlewares, TInputValidator>>;
}
export interface RequiredFetcherDataOptions<TMiddlewares, TInputValidator> extends FetcherBaseOptions {
    data: Expand<IntersectAllValidatorInputs<TMiddlewares, TInputValidator>>;
}
export type RscStream<T> = {
    __cacheState: T;
};
export type Method = 'GET' | 'POST';
export type ServerFnReturnType<TRegister, TResponse, TStrict extends ServerFnStrict = true> = ServerFnStrictOutput<TStrict> extends false ? TResponse : TResponse extends PromiseLike<infer U> ? Promise<ServerFnReturnType<TRegister, U, TStrict>> : TResponse extends Response ? TResponse : ValidateSerializableInput<TRegister, TResponse>;
export type ServerFn<TRegister, TMethod, TMiddlewares, TInputValidator, TResponse, TStrict extends ServerFnStrict = true> = (ctx: ServerFnCtx<TRegister, TMethod, TMiddlewares, TInputValidator>) => ServerFnReturnType<TRegister, TResponse, TStrict>;
export interface ServerFnCtx<TRegister, TMethod, TMiddlewares, TInputValidator> {
    data: Expand<IntersectAllValidatorOutputs<TMiddlewares, TInputValidator>>;
    serverFnMeta: ServerFnMeta;
    context: Expand<AssignAllServerFnContext<TRegister, TMiddlewares, {}>>;
    method: TMethod;
}
export type CompiledFetcherFn<TRegister, TResponse> = {
    (opts: CompiledFetcherFnOptions & ServerFnBaseOptions<TRegister, Method>): Promise<TResponse>;
    url: string;
    serverFnMeta: ServerFnMeta;
};
export type ServerFnBaseOptions<TRegister, TMethod extends Method = 'GET', TResponse = unknown, TMiddlewares = unknown, TInputValidator = unknown, TStrict extends ServerFnStrict = true> = {
    method: TMethod;
    strict?: TStrict;
    middleware?: Constrain<TMiddlewares, ReadonlyArray<AnyFunctionMiddleware | AnyRequestMiddleware>>;
    validator?: ConstrainValidator<TRegister, TMethod, TInputValidator, TStrict>;
    /** @deprecated Use `validator` instead. */
    inputValidator?: ConstrainValidator<TRegister, TMethod, TInputValidator, TStrict>;
    extractedFn?: CompiledFetcherFn<TRegister, TResponse>;
    serverFn?: ServerFn<TRegister, TMethod, TMiddlewares, TInputValidator, TResponse, TStrict>;
};
export type ValidateValidatorInput<TRegister, TMethod extends Method, TInputValidator, TStrict extends ServerFnStrict = true> = ServerFnStrictInput<TStrict> extends false ? ResolveValidatorInput<TInputValidator> : TMethod extends 'POST' ? ResolveValidatorInput<TInputValidator> extends FormData ? ResolveValidatorInput<TInputValidator> : ValidateSerializable<ResolveValidatorInput<TInputValidator>, RegisteredSerializableInput<TRegister>> : ValidateSerializable<ResolveValidatorInput<TInputValidator>, RegisteredSerializableInput<TRegister>>;
export type ValidateValidator<TRegister, TMethod extends Method, TInputValidator, TStrict extends ServerFnStrict = true> = ValidateValidatorInput<TRegister, TMethod, TInputValidator, TStrict> extends infer TInput ? Validator<TInput, any> : never;
export type ConstrainValidator<TRegister, TMethod extends Method, TInputValidator, TStrict extends ServerFnStrict = true> = (unknown extends TInputValidator ? TInputValidator : ResolveValidatorInput<TInputValidator> extends ValidateValidator<TRegister, TMethod, TInputValidator, TStrict> ? TInputValidator : never) | ValidateValidator<TRegister, TMethod, TInputValidator, TStrict>;
export type AppendMiddlewares<TMiddlewares, TNewMiddlewares> = TMiddlewares extends ReadonlyArray<any> ? TNewMiddlewares extends ReadonlyArray<any> ? readonly [...TMiddlewares, ...TNewMiddlewares] : TMiddlewares : TNewMiddlewares;
export interface ServerFnMiddleware<TRegister, TMethod extends Method, TMiddlewares, TInputValidator, TStrict extends ServerFnStrict> {
    middleware: <const TNewMiddlewares>(middlewares: Constrain<TNewMiddlewares, ReadonlyArray<AnyFunctionMiddleware | AnyRequestMiddleware | AnyServerFn>>) => ServerFnAfterMiddleware<TRegister, TMethod, AppendMiddlewares<TMiddlewares, TNewMiddlewares>, TInputValidator, TStrict>;
}
export interface ServerFnAfterMiddleware<TRegister, TMethod extends Method, TMiddlewares, TInputValidator, TStrict extends ServerFnStrict> extends ServerFnWithTypes<TRegister, TMethod, TMiddlewares, TInputValidator, undefined, TStrict>, ServerFnMiddleware<TRegister, TMethod, TMiddlewares, undefined, TStrict>, ServerFnValidator<TRegister, TMethod, TMiddlewares, TStrict>, ServerFnHandler<TRegister, TMethod, TMiddlewares, TInputValidator, TStrict> {
    <TNewMethod extends Method = TMethod, TNewStrict extends ServerFnStrict = TStrict>(options?: ServerFnOptions<TNewMethod, TNewStrict>): ServerFnAfterMiddleware<TRegister, TNewMethod, TMiddlewares, TInputValidator, TNewStrict>;
}
export type ValidatorFn<TRegister, TMethod extends Method, TMiddlewares, TStrict extends ServerFnStrict> = <TInputValidator>(validator: ConstrainValidator<TRegister, TMethod, TInputValidator, TStrict>) => ServerFnAfterValidator<TRegister, TMethod, TMiddlewares, TInputValidator, TStrict>;
export interface ServerFnValidator<TRegister, TMethod extends Method, TMiddlewares, TStrict extends ServerFnStrict> {
    validator: ValidatorFn<TRegister, TMethod, TMiddlewares, TStrict>;
    /** @deprecated Use `validator` instead. */
    inputValidator: ValidatorFn<TRegister, TMethod, TMiddlewares, TStrict>;
}
export interface ServerFnAfterValidator<TRegister, TMethod extends Method, TMiddlewares, TInputValidator, TStrict extends ServerFnStrict> extends ServerFnWithTypes<TRegister, TMethod, TMiddlewares, TInputValidator, undefined, TStrict>, ServerFnMiddleware<TRegister, TMethod, TMiddlewares, TInputValidator, TStrict>, ServerFnHandler<TRegister, TMethod, TMiddlewares, TInputValidator, TStrict> {
}
export interface ServerFnAfterTyper<TRegister, TMethod extends Method, TMiddlewares, TInputValidator, TStrict extends ServerFnStrict> extends ServerFnWithTypes<TRegister, TMethod, TMiddlewares, TInputValidator, undefined, TStrict>, ServerFnHandler<TRegister, TMethod, TMiddlewares, TInputValidator, TStrict> {
}
export interface ServerFnHandler<TRegister, TMethod extends Method, TMiddlewares, TInputValidator, TStrict extends ServerFnStrict> {
    handler: <TNewResponse>(fn?: ServerFn<TRegister, TMethod, TMiddlewares, TInputValidator, TNewResponse, TStrict>) => Fetcher<TMiddlewares, TInputValidator, TNewResponse>;
}
export interface ServerFnBuilder<TRegister, TMethod extends Method = 'GET', TStrict extends ServerFnStrict = true> extends ServerFnWithTypes<TRegister, TMethod, undefined, undefined, undefined, TStrict>, ServerFnMiddleware<TRegister, TMethod, undefined, undefined, TStrict>, ServerFnValidator<TRegister, TMethod, undefined, TStrict>, ServerFnHandler<TRegister, TMethod, undefined, undefined, TStrict> {
    <TNewMethod extends Method = TMethod, TNewStrict extends ServerFnStrict = TStrict>(options?: ServerFnOptions<TNewMethod, TNewStrict>): ServerFnBuilder<TRegister, TNewMethod, TNewStrict>;
    options: ServerFnBaseOptions<TRegister, TMethod, unknown, undefined, undefined, TStrict>;
}
export interface ServerFnWithTypes<in out TRegister, in out TMethod extends Method, in out TMiddlewares, in out TInputValidator, in out TResponse, in out TStrict extends ServerFnStrict> {
    '~types': ServerFnTypes<TRegister, TMethod, TMiddlewares, TInputValidator, TResponse, TStrict>;
    options: ServerFnBaseOptions<TRegister, TMethod, unknown, undefined, undefined, TStrict>;
    [TSS_SERVER_FUNCTION_FACTORY]: true;
}
export type AnyServerFn = ServerFnWithTypes<any, any, any, any, any, any>;
export interface ServerFnTypes<in out TRegister, in out TMethod extends Method, in out TMiddlewares, in out TInputValidator, in out TResponse, in out TStrict extends ServerFnStrict> {
    method: TMethod;
    strict: TStrict;
    middlewares: TMiddlewares;
    validator: TInputValidator;
    /** @deprecated Use `validator` instead. */
    inputValidator: TInputValidator;
    response: TResponse;
    allServerContext: AssignAllServerFnContext<TRegister, TMiddlewares>;
    allInput: IntersectAllValidatorInputs<TMiddlewares, TInputValidator>;
    allOutput: IntersectAllValidatorOutputs<TMiddlewares, TInputValidator>;
}
export declare function flattenMiddlewares<T extends AnyFunctionMiddleware | AnyRequestMiddleware>(middlewares: Array<T>, maxDepth?: number): Array<T>;
export type ServerFnMiddlewareOptions = {
    method: Method;
    data: any;
    headers?: HeadersInit;
    signal?: AbortSignal;
    sendContext?: any;
    context?: any;
    serverFnMeta: ClientFnMeta;
    fetch?: CustomFetch;
};
export type ServerFnMiddlewareResult = ServerFnMiddlewareOptions & {
    result?: unknown;
    error?: unknown;
};
export type NextFn = (ctx: ServerFnMiddlewareResult) => Promise<ServerFnMiddlewareResult>;
export type MiddlewareFn = (ctx: ServerFnMiddlewareOptions & {
    next: NextFn;
}) => Promise<ServerFnMiddlewareResult>;
export declare function execValidator(validator: AnyValidator, input: unknown): Promise<unknown>;
