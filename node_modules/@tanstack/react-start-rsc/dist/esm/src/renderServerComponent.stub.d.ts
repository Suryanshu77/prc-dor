import { RenderableServerComponentBuilder, ValidateRenderableServerComponent } from './ServerComponentTypes.js';
/**
 * Client stub for renderServerComponent.
 *
 * This function should never be called at runtime on the client.
 * It exists only to satisfy bundler imports in client bundles.
 * The real implementation only runs inside server functions.
 */
export declare function renderServerComponent<TNode>(_node: ValidateRenderableServerComponent<TNode>): Promise<RenderableServerComponentBuilder<TNode>>;
