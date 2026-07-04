import { AnyCompositeComponent } from './ServerComponentTypes.js';
/**
 * Renders composite RSC data with slot support.
 *
 * Use this component to render data from `createCompositeComponent`.
 * Pass slot implementations as props to fill in ClientSlot placeholders.
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
export declare function CompositeComponent<TComp extends AnyCompositeComponent>(props: CompositeComponentProps<TComp>): TComp['~types']['return'];
export type CompositeComponentProps<TComp extends AnyCompositeComponent> = {
    src: TComp;
} & TComp['~types']['props'];
