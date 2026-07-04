import { CompositeComponentResult, ValidateCompositeComponent } from './ServerComponentTypes.js';
/**
 * Client stub for createCompositeComponent.
 *
 * This function should never be called at runtime on the client.
 * It exists only to satisfy bundler imports in client bundles.
 * The real implementation only runs inside server functions.
 */
export declare function createCompositeComponent<TComp>(_component: ValidateCompositeComponent<TComp>): Promise<CompositeComponentResult<TComp>>;
