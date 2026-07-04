import { AnyRenderableServerComponent, RenderableServerComponentBuilder, ValidateRenderableServerComponent } from './ServerComponentTypes.js';
import { RscCssEnvelopeOptions } from './rscCssEnvelope.js';
export type { RscSsrHandler, RscDecodeResult } from './rscSsrHandler.js';
/**
 * Renderable RSC handle type - used for serialization detection.
 */
/**
 * Type guard for renderable RSC handle.
 */
export declare function isRenderableRscHandle(value: unknown): value is AnyRenderableServerComponent;
/**
 * Renders a React element to an RSC Flight stream.
 *
 * Returns a "renderable proxy" that can be:
 * - Rendered directly as `{data}` in JSX
 * - Accessed for nested selections: `{data.foo.bar.Hello}`
 *
 * No slot support - for slots use `createCompositeComponent`.
 *
 * @example
 * ```tsx
 * // In a loader or server function
 * const data = await renderServerComponent(<MyServerComponent foo="bar" />)
 *
 * // In the route component
 * return (
 *   <div>
 *     {data}
 *     {data.sidebar.Menu}
 *   </div>
 * )
 * ```
 */
export declare function renderServerComponent<TNode>(node: ValidateRenderableServerComponent<TNode>, options?: RscCssEnvelopeOptions): Promise<RenderableServerComponentBuilder<TNode>>;
