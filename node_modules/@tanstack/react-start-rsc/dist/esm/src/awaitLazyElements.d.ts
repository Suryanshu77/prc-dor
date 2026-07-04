/**
 * Optional callback for collecting CSS hrefs during tree traversal.
 * Only called server-side when processing <link rel="stylesheet" data-rsc-css-href>
 */
export type CssHrefCollector = (href: string) => void;
/**
 * Wait for all lazy elements in a tree to be resolved.
 * This ensures client component chunks are fully loaded before rendering,
 * preventing Suspense boundaries from flashing during SWR navigation.
 *
 * Also collects CSS hrefs from <link rel="stylesheet" data-rsc-css-href>
 * elements for preloading in <head>.
 *
 * @param tree - The tree to process
 * @param cssCollector - Optional callback to collect CSS hrefs (server-only)
 */
export declare function awaitLazyElements(tree: unknown, cssCollector?: CssHrefCollector): Promise<void>;
