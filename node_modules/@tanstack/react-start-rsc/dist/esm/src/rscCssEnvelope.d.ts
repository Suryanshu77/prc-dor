import { default as React } from 'react';
declare const RSC_CSS_ENVELOPE_RESOURCES = "__tanstackStartRscCss";
export interface RscCssEnvelopeOptions {
    [RSC_CSS_ENVELOPE_RESOURCES]?: React.ReactNode;
}
export declare function createRscCssEnvelope<TValue>(value: TValue, options?: RscCssEnvelopeOptions): TValue | Record<string, unknown>;
export declare function unwrapRscCssEnvelope(value: unknown): unknown;
export {};
