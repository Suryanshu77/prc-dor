import { CompositeComponentResult, ValidateCompositeComponent } from './ServerComponentTypes.js';
import { RscCssEnvelopeOptions } from './rscCssEnvelope.js';
/**
 * Creates a composite server component with slot support.
 *
 * Supports returning:
 * - A ReactNode directly
 * - An object structure with ReactNodes: accessed as `src.Foo`
 * - Nested structures: accessed as `src.x.Bar`
 *
 * Props that are functions become slots - they render as ClientSlot placeholders
 * in the RSC output, filled in by the consumer with actual implementations.
 *
 * The returned value is NOT directly renderable. Use `<CompositeComponent src={...} />`.
 *
 * @example
 * ```tsx
 * const src = await createCompositeComponent((props) => (
 *   <div>
 *     <header>{props.header('Dashboard')}</header>
 *     <main>{props.children}</main>
 *   </div>
 * ))
 *
 * // In route component
 * return (
 *   <CompositeComponent src={src} header={(title) => <h1>{title}</h1>}>
 *     <p>Main content</p>
 *   </CompositeComponent>
 * )
 * ```
 */
export declare function createCompositeComponent<TComp>(component: ValidateCompositeComponent<TComp>, options?: RscCssEnvelopeOptions): Promise<CompositeComponentResult<TComp>>;
